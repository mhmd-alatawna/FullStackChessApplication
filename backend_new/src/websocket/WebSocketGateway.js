const AppError = require("../AppError");
const { GAME_STATES } = require("../domain/Game");
const { getBearerToken } = require("../security/securityHelpers");
const { createSuccessResponse, createErrorResponse } = require("../api/response");
const {
  OPERATIONS,
  assertPermission,
  canAccessGame,
} = require("../security/rbac");

class WebSocketGateway {
  constructor(io, useCases, timeoutScheduler, logger) {
    this.io = io;
    this.authUseCases = useCases.auth;
    this.gamesUseCases = useCases.games;
    this.matchmakingUseCases = useCases.matchmaking;
    this.automatedPlayersUseCases = useCases.automatedPlayers;
    this.timeoutScheduler = timeoutScheduler;
    this.logger = logger;
    this.socketsByToken = new Map();
  }

  register() {
    // Registration only attaches callbacks; it performs no blocking I/O or CPU work.
    this.io.use((socket, next) => this._authenticateConnection(socket, next));
    this.io.on("connection", (socket) => this._registerSocket(socket));
  }

  async restore() {
    const games = await this.gamesUseCases.getAllGames();
    for (const gameData of games) {
      const restored = await this.automatedPlayersUseCases.ensureAgentForGame(gameData);
      if (restored) {
        setImmediate(() => {
          this._continueAutomatedGame(gameData).catch((error) => {
            this.logger.error(
              `Failed to resume automated game ${gameData.id}: ${error.stack || error.message}`,
            );
          });
        });
      }
    }
  }

  disconnectSession(token) {
    const sockets = this.socketsByToken.get(token);
    if (!sockets) {
      return;
    }

    for (const socket of sockets) {
      socket.disconnect(true);
    }
    this.socketsByToken.delete(token);
  }

  disconnectUser(userId) {
    for (const sockets of this.socketsByToken.values()) {
      for (const socket of sockets) {
        if (socket.user.id === userId) {
          socket.disconnect(true);
        }
      }
    }
  }

  stop() {
    for (const token of this.socketsByToken.keys()) {
      this.disconnectSession(token);
    }
    this.automatedPlayersUseCases.stop();
  }

  async _authenticateConnection(socket, next) {
    try {
      let token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        token = getBearerToken(socket.handshake.headers.authorization);
      }
      if (!token) {
        throw new AppError("A socket authentication token is required", 401, "UNAUTHENTICATED");
      }

      socket.user = await this.authUseCases.getAuthenticatedUser(token);
      socket.authToken = token;
      next();
    } catch (error) {
      const connectionError = new Error("Socket authentication failed");
      connectionError.data = createErrorResponse(error);
      next(connectionError);
    }
  }

  _registerSocket(socket) {
    this._trackSocket(socket);
    socket.join(`user:${socket.user.id}`);

    socket.on("disconnect", () => this._untrackSocket(socket));

    this._registerCommands(socket, ["matching:join", "matchmaking:join"], OPERATIONS.MATCHING_JOIN,
      async (payload) => {
        this._validatePayload(payload, ["durationMinutes"]);
        return this._joinMatching(socket, payload.durationMinutes);
      });

    this._registerCommands(socket, ["agent:join"], OPERATIONS.AGENT_PLAY, async (payload) => {
      this._validatePayload(payload, ["durationMinutes", "agentId"]);
      return this._joinAgentGame(socket, payload.durationMinutes, payload.agentId);
    });

    this._registerCommands(socket, ["matching:cancel", "matchmaking:cancel"], OPERATIONS.MATCHING_CANCEL,
      async () => {
        await this.matchmakingUseCases.cancelMatching(socket.user.id);
        return { cancelled: true };
      });

    this._registerCommands(socket, ["game:join"], OPERATIONS.GAME_READ_SELF, async (payload) => {
        this._validatePayload(payload, ["gameId"]);
        const gameData = await this._getAccessibleGame(socket.user, payload.gameId);
        await socket.join(`game:${gameData.id}`);
        return this._continueAutomatedGame(gameData);
    });

    this._registerCommands(socket, ["game:sync"], OPERATIONS.GAME_READ_SELF, async (payload) => {
        this._validatePayload(payload, ["gameId"]);
        this._requireGameJoin(socket, payload.gameId);
        return this._getAccessibleGame(socket.user, payload.gameId);
    });

    this._registerCommands(socket, ["game:legal-moves"], OPERATIONS.GAME_READ_SELF,
      async (payload) => {
        this._validatePayload(payload, ["gameId"]);
        this._requireGameJoin(socket, payload.gameId);
        return this.gamesUseCases.getLegalMoves(payload.gameId, socket.user.id);
      });

    this._registerCommands(socket, ["game:move"], OPERATIONS.GAME_MOVE, async (payload) => {
        this._validatePayload(payload, ["gameId", "from", "to"]);
        this._requireGameJoin(socket, payload.gameId);
        return this._makeMove(socket, payload);
    });

    this._registerCommands(socket, ["game:resign"], OPERATIONS.GAME_RESIGN, async (payload) => {
        this._validatePayload(payload, ["gameId"]);
        this._requireGameJoin(socket, payload.gameId);
        return this._resign(socket, payload.gameId);
    });
  }

  _registerCommands(socket, eventNames, operation, action) {
    for (const eventName of eventNames) {
      socket.on(eventName, (payload, acknowledge) => {
        if (typeof payload === "function") {
          acknowledge = payload;
          payload = {};
        }
        this._runAction(socket, acknowledge, operation, () => action(payload));
      });
    }
  }

  async _runAction(socket, acknowledge, operation, action) {
    try {
      socket.user = await this.authUseCases.getAuthenticatedUser(socket.authToken);
      assertPermission(socket.user, operation);
      const data = await action();
      if (typeof acknowledge === "function") {
        acknowledge(createSuccessResponse(data));
      }
    } catch (error) {
      if (!(error instanceof AppError)) {
        this.logger.error(`Unhandled socket error: ${error.stack || error.message}`);
      }

      if (typeof acknowledge === "function") {
        acknowledge(createErrorResponse(error));
      }
      if (error instanceof AppError && error.errorCode === "UNAUTHENTICATED") {
        socket.disconnect(true);
      }
    }
  }

  async _joinMatching(socket, durationMinutes) {
    const result = await this.matchmakingUseCases.joinMatching(
      socket.user.id,
      durationMinutes,
    );

    if (!result.matched) {
      socket.emit("matching:waiting", createSuccessResponse(result));
      socket.emit("matchmaking:waiting", createSuccessResponse(result));
      return result;
    }

    const gameData = result.game;
    const gameRoom = `game:${gameData.id}`;
    this.io.in(`user:${gameData.whitePlayerId}`).socketsJoin(gameRoom);
    this.io.in(`user:${gameData.blackPlayerId}`).socketsJoin(gameRoom);

    const whiteResult = {
      game: gameData,
      playerColor: "white",
    };
    const blackResult = {
      game: gameData,
      playerColor: "black",
    };
    this._emitMatchingResult(gameData.whitePlayerId, "matched", whiteResult);
    this._emitMatchingResult(gameData.blackPlayerId, "matched", blackResult);

    this.timeoutScheduler.start(gameData);
    return result;
  }

  async _joinAgentGame(socket, durationMinutes, agentId) {
    const result = await this.matchmakingUseCases.createAutomatedGame(
      socket.user.id,
      durationMinutes,
      agentId,
    );
    await this.automatedPlayersUseCases.createAgentForGame(result.game, result.agentId);
    await socket.join(`game:${result.game.id}`);
    this.timeoutScheduler.start(result.game);
    return result;
  }

  async _makeMove(socket, payload) {
    const result = await this.gamesUseCases.makeMove(
      payload.gameId,
      socket.user.id,
      {
        from: payload.from,
        to: payload.to,
        promotion: payload.promotion,
      },
    );

    this._publishGameResult(result);
    if (this._isFinishedGame(result.game)) {
      return result;
    }

    const automatedResult = await this.automatedPlayersUseCases.playTurn(result.game);
    if (!automatedResult) {
      return result;
    }
    if (automatedResult.skipped) {
      return {
        game: automatedResult.game,
        move: result.move,
        automatedMove: null,
      };
    }
    this._publishGameResult(automatedResult);

    return {
      game: automatedResult.game,
      move: result.move,
      automatedMove: automatedResult.move,
    };
  }

  async _resign(socket, gameId) {
    const game = await this.gamesUseCases.resignGame(gameId, socket.user.id);
    this.timeoutScheduler.cancel(game.id);
    this.automatedPlayersUseCases.finishGame(game.id);
    this.io.to(`game:${game.id}`).emit(
      "game:finished",
      createSuccessResponse({ game, move: null }),
    );
    return game;
  }

  async _getAccessibleGame(user, gameId) {
    const gameData = await this.gamesUseCases.getGame(gameId);
    if (!canAccessGame(user, gameData)) {
      throw new AppError("You do not have permission to access this game", 403, "FORBIDDEN");
    }
    return gameData;
  }

  async _continueAutomatedGame(gameData) {
    await this.automatedPlayersUseCases.ensureAgentForGame(gameData);
    const result = await this.automatedPlayersUseCases.playTurn(gameData);
    if (!result) {
      return gameData;
    }
    if (result.skipped) {
      return result.game;
    }
    this._publishGameResult(result);
    return result.game;
  }

  _requireGameJoin(socket, gameId) {
    if (!socket.rooms.has(`game:${gameId}`)) {
      throw new AppError("Join the game before using live game commands", 409, "GAME_NOT_JOINED");
    }
  }

  _publishGameResult(result) {
    if (this._isFinishedGame(result.game)) {
      this.timeoutScheduler.cancel(result.game.id);
      this.automatedPlayersUseCases.finishGame(result.game.id);
      this.io.to(`game:${result.game.id}`).emit("game:finished", createSuccessResponse(result));
      return;
    }
    this.timeoutScheduler.resume(result.game);
    this.io.to(`game:${result.game.id}`).emit("game:updated", createSuccessResponse(result));
  }

  _emitMatchingResult(userId, eventSuffix, payload) {
    const room = this.io.to(`user:${userId}`);
    const response = createSuccessResponse(payload);
    room.emit(`matching:${eventSuffix}`, response);
    room.emit(`matchmaking:${eventSuffix}`, response);
  }

  _validatePayload(payload, requiredFields) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new AppError("A command payload object is required", 400, "VALIDATION_ERROR");
    }

    const missingFields = requiredFields.filter((field) => {
      return payload[field] === undefined || payload[field] === null || payload[field] === "";
    });
    if (missingFields.length > 0) {
      throw new AppError("Required command fields are missing", 400, "VALIDATION_ERROR", {
        required: requiredFields,
        missing: missingFields,
      });
    }
  }

  _trackSocket(socket) {
    const sockets = this.socketsByToken.get(socket.authToken) || new Set();
    sockets.add(socket);
    this.socketsByToken.set(socket.authToken, sockets);
  }

  _untrackSocket(socket) {
    const sockets = this.socketsByToken.get(socket.authToken);
    if (!sockets) {
      return;
    }
    sockets.delete(socket);
    if (sockets.size === 0) {
      this.socketsByToken.delete(socket.authToken);
    }
  }

  _isFinishedGame(game) {
    return Object.values(GAME_STATES.TERMINATED).includes(game.state);
  }

}

module.exports = WebSocketGateway;
