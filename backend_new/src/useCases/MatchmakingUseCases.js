const AppError = require("../AppError");
const { Game } = require("../domain/Game");
const { isAgentStrategyAvailable, isSupportedAgentStrategy } = require("../agents/createChessAgent");

class MatchmakingUseCases {
  constructor(dataAccess, config) {
    this.dataAccess = dataAccess;
    this.config = config;
  }

  async joinMatching(userId, durationMinutes) {
    return this.dataAccess.transaction((dataAccess) => {
      return this._joinMatching(dataAccess, userId, durationMinutes);
    });
  }

  async _joinMatching(dataAccess, userId, durationMinutes) {
    const user = await dataAccess.users.findById(userId);
    if (!user) {
      throw new AppError("The user was not found", 404, "USER_NOT_FOUND", { userId });
    }
    if (user.isAutomated()) {
      throw new AppError("Automated users cannot enter matchmaking", 400, "AGENT_CANNOT_MATCH");
    }

    const preparedDuration = this._prepareDuration(durationMinutes);

    const existingTicket = await dataAccess.matchmaking.findByUserId(userId);
    if (existingTicket) {
      return {
        matched: false,
        ticket: existingTicket,
      };
    }

    const opponentTicket = await dataAccess.matchmaking.takeWaiting(preparedDuration, userId);
    if (!opponentTicket) {
      const ticket = {
        id: await dataAccess.ids.next(),
        userId,
        durationMinutes: preparedDuration,
        createdAt: new Date().toISOString(),
      };

      await dataAccess.matchmaking.create(ticket);
      return {
        matched: false,
        ticket,
      };
    }

    const game = Game.create(
      await dataAccess.ids.next(),
      opponentTicket.userId,
      preparedDuration,
    );
    game.addBlackPlayer(userId);
    await dataAccess.games.create(game);
    const opponent = await dataAccess.users.findById(opponentTicket.userId);

    return {
      matched: true,
      game: this._addPlayerNames(game.getData(), opponent, user),
    };
  }

  async createAutomatedGame(userId, durationMinutes, agentId) {
    return this.dataAccess.transaction((dataAccess) => {
      return this._createAutomatedGame(dataAccess, userId, durationMinutes, agentId);
    });
  }

  async _createAutomatedGame(dataAccess, userId, durationMinutes, agentId) {
    const user = await dataAccess.users.findById(userId);
    if (!user) {
      throw new AppError("The user was not found", 404, "USER_NOT_FOUND", { userId });
    }
    if (user.isAutomated()) {
      throw new AppError("Automated users cannot start games", 400, "AGENT_CANNOT_MATCH");
    }

    const existingTicket = await dataAccess.matchmaking.findByUserId(userId);
    if (existingTicket) {
      throw new AppError("Cancel the current matching request first", 409, "USER_ALREADY_QUEUED");
    }

    const preparedDuration = this._prepareDuration(durationMinutes);
    const agent = await dataAccess.agents.findById(agentId);
    if (!agent || !agent.enabled) {
      throw new AppError("The automated player was not found", 404, "AGENT_NOT_FOUND", { agentId });
    }
    if (!isSupportedAgentStrategy(agent.strategy)) {
      throw new AppError(
        "The automated strategy is not supported",
        500,
        "AGENT_STRATEGY_NOT_SUPPORTED",
      );
    }
    if (!isAgentStrategyAvailable(agent.strategy, this.config)) {
      const errorCode = agent.strategy === "uci" ? "UCI_ENGINE_NOT_CONFIGURED" : "REMOTE_ENGINE_NOT_CONFIGURED";
      throw new AppError("The selected external engine is not configured", 503, errorCode);
    }

    const automatedUser = await dataAccess.users.findById(agent.userId);
    if (!automatedUser || !automatedUser.isAutomated()) {
      throw new AppError("The automated player is not configured correctly", 500, "INVALID_AGENT");
    }

    const game = Game.create(await dataAccess.ids.next(), userId, preparedDuration);
    game.addBlackPlayer(agent.userId);
    await dataAccess.games.create(game);

    return {
      matched: true,
      automated: true,
      agentId: agent.id,
      game: this._addPlayerNames(game.getData(), user, automatedUser),
    };
  }

  async cancelMatching(userId) {
    return this.dataAccess.transaction((dataAccess) => {
      return this._cancelMatching(dataAccess, userId, true);
    });
  }

  async _cancelMatching(dataAccess, userId, required) {
    const ticket = await dataAccess.matchmaking.findByUserId(userId);
    if (!ticket) {
      if (!required) {
        return false;
      }
      throw new AppError(
        "The user is not waiting for a match",
        404,
        "MATCHMAKING_TICKET_NOT_FOUND",
        { userId },
      );
    }

    await dataAccess.matchmaking.delete(ticket.id);
    return true;
  }

  async cancelIfWaiting(userId) {
    return this.dataAccess.transaction((dataAccess) => {
      return this._cancelMatching(dataAccess, userId, false);
    });
  }

  _prepareDuration(durationMinutes) {
    const duration = Number(durationMinutes);
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new AppError("The game duration must be a positive number of minutes", 400, "INVALID_DURATION");
    }
    return duration;
  }

  _addPlayerNames(game, whitePlayer, blackPlayer) {
    const white = whitePlayer.getData();
    const black = blackPlayer.getData();
    return {
      ...game,
      whitePlayerName: `${white.firstName} ${white.lastName}`,
      blackPlayerName: `${black.firstName} ${black.lastName}`,
    };
  }
}

module.exports = MatchmakingUseCases;
