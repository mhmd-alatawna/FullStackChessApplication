const { Chess } = require("chess.js");
const AppError = require("../AppError");

const GAME_STATES = Object.freeze({
  ONGOING: Object.freeze({
    WAITING: "waiting",
    WHITE_TURN: "white_turn",
    BLACK_TURN: "black_turn",
  }),
  TERMINATED: Object.freeze({
    WHITE_WON: "white_won",
    BLACK_WON: "black_won",
    DRAW: "draw",
    CANCELLED: "cancelled",
  }),
});

const END_REASONS = Object.freeze({
  CHECKMATE: "checkmate",
  STALEMATE: "stalemate",
  REPETITION: "repetition",
  INSUFFICIENT_MATERIAL: "insufficient_material",
  FIFTY_MOVE_RULE: "fifty_move_rule",
  RESIGNATION: "resignation",
  TIMEOUT: "timeout",
  CANCELLED: "cancelled",
  OTHER_DRAW: "other_draw",
});

const ONGOING_STATES = Object.values(GAME_STATES.ONGOING);
const TERMINATED_STATES = Object.values(GAME_STATES.TERMINATED);

class Game {
  constructor(gameData) {
    if (!gameData || typeof gameData !== "object") {
      throw new AppError("Game data is required", 400, "GAME_DATA_REQUIRED");
    }

    this._data = {
      id: gameData.id,
      whitePlayerId: gameData.whitePlayerId,
      blackPlayerId: gameData.blackPlayerId ?? null,
      state: gameData.state ?? GAME_STATES.ONGOING.WAITING,
      moves: gameData.moves ?? [],
      endReason: gameData.endReason ?? null,
      clock: gameData.clock ?? null,
    };

    if (!Array.isArray(this._data.moves)) {
      throw new AppError("Game moves must be an array", 400, "INVALID_MOVE_HISTORY");
    }

    this._data.moves = this._data.moves.map((move) => {
      return { uci: move.uci, san: move.san };
    });

    if (this._data.clock) {
      this._data.clock = this._prepareClock(this._data.clock);
    }

    this._validate();
  }

  static create(id, whitePlayerId, durationMinutes = null) {
    let clock = null;
    if (durationMinutes !== null && durationMinutes !== undefined) {
      const durationMs = Number(durationMinutes) * 60 * 1000;
      clock = {
        durationMinutes: Number(durationMinutes),
        whiteRemainingMs: durationMs,
        blackRemainingMs: durationMs,
        turnStartedAt: null,
      };
    }

    return new Game({ id, whitePlayerId, clock });
  }

  _prepareClock(clock) {
    let turnStartedAt = null;
    if (clock.turnStartedAt) {
      const parsedDate = new Date(clock.turnStartedAt);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError("The game clock start time is invalid", 400, "INVALID_TIME_CONTROL");
      }
      turnStartedAt = parsedDate.toISOString();
    }

    const preparedClock = {
      durationMinutes: Number(clock.durationMinutes),
      whiteRemainingMs: Number(clock.whiteRemainingMs),
      blackRemainingMs: Number(clock.blackRemainingMs),
      turnStartedAt,
    };

    const invalidClock = !Number.isInteger(preparedClock.durationMinutes) ||
      preparedClock.durationMinutes <= 0 ||
      !Number.isFinite(preparedClock.whiteRemainingMs) ||
      preparedClock.whiteRemainingMs < 0 ||
      !Number.isFinite(preparedClock.blackRemainingMs) ||
      preparedClock.blackRemainingMs < 0;

    if (invalidClock) {
      throw new AppError("The game clock is invalid", 400, "INVALID_TIME_CONTROL");
    }
    return preparedClock;
  }

  _validate() {
    if (this._data.id === undefined || this._data.id === null || this._data.id === "") {
      throw new AppError("A game id is required", 400, "GAME_ID_REQUIRED");
    }
    if (this._data.whitePlayerId === undefined || this._data.whitePlayerId === null) {
      throw new AppError("A white player is required", 400, "WHITE_PLAYER_REQUIRED");
    }
    if (this._data.whitePlayerId === this._data.blackPlayerId) {
      throw new AppError("A user cannot play against themselves", 400, "SELF_PLAY_NOT_ALLOWED");
    }

    const knownStates = [...ONGOING_STATES, ...TERMINATED_STATES];
    if (!knownStates.includes(this._data.state)) {
      throw new AppError("The game state is invalid", 400, "INVALID_GAME_STATE");
    }

    const board = this._loadBoard();

    if (this.isWaiting()) {
      const invalidWaitingState = this._data.blackPlayerId !== null ||
        this._data.moves.length > 0 ||
        this._data.endReason !== null;
      if (invalidWaitingState) {
        throw new AppError("Waiting game data is inconsistent", 500, "GAME_STATE_MISMATCH");
      }
      if (this._data.clock && this._data.clock.turnStartedAt !== null) {
        throw new AppError("A waiting game clock cannot be running", 500, "GAME_STATE_MISMATCH");
      }
    }

    if (this.isActive()) {
      if (this._data.blackPlayerId === null || this._data.endReason !== null) {
        throw new AppError("Active game data is inconsistent", 500, "GAME_STATE_MISMATCH");
      }
      if (board.isGameOver()) {
        throw new AppError("An active game cannot contain a finished board", 500, "GAME_STATE_MISMATCH");
      }
      if (this._data.clock && this._data.clock.turnStartedAt === null) {
        throw new AppError("An active timed game clock must be running", 500, "GAME_STATE_MISMATCH");
      }
    }

    if (this.isFinished()) {
      if (this._data.endReason === null) {
        throw new AppError("A finished game requires an end reason", 500, "GAME_STATE_MISMATCH");
      }
      if (!this.isCancelled() && this._data.blackPlayerId === null) {
        throw new AppError("A completed game requires two players", 500, "GAME_STATE_MISMATCH");
      }
      if (this._data.clock && this._data.clock.turnStartedAt !== null) {
        throw new AppError("A finished game clock cannot be running", 500, "GAME_STATE_MISMATCH");
      }
    }

    if (this.isCancelled()) {
      if (this._data.endReason !== END_REASONS.CANCELLED) {
        throw new AppError("A cancelled game has an invalid end reason", 500, "GAME_STATE_MISMATCH");
      }
    }

    if (this.isWhiteTurn() && board.turn() !== "w") {
      throw new AppError("The move history does not match the game state", 500, "GAME_STATE_MISMATCH");
    }
    if (this.isBlackTurn() && board.turn() !== "b") {
      throw new AppError("The move history does not match the game state", 500, "GAME_STATE_MISMATCH");
    }
  }

  getId() {
    return this._data.id;
  }

  getPlayerIds() {
    const playerIds = [this._data.whitePlayerId];
    if (this._data.blackPlayerId !== null) {
      playerIds.push(this._data.blackPlayerId);
    }
    return playerIds;
  }

  getWinnerId() {
    if (this._data.state === GAME_STATES.TERMINATED.WHITE_WON) {
      return this._data.whitePlayerId;
    }
    if (this._data.state === GAME_STATES.TERMINATED.BLACK_WON) {
      return this._data.blackPlayerId;
    }
    return null;
  }

  getActivePlayerId() {
    return this._getCurrentPlayerId();
  }

  isWaiting() {
    return this._data.state === GAME_STATES.ONGOING.WAITING;
  }

  isWhiteTurn() {
    return this._data.state === GAME_STATES.ONGOING.WHITE_TURN;
  }

  isBlackTurn() {
    return this._data.state === GAME_STATES.ONGOING.BLACK_TURN;
  }

  isActive() {
    return this.isWhiteTurn() || this.isBlackTurn();
  }

  isFinished() {
    return TERMINATED_STATES.includes(this._data.state);
  }

  isCancelled() {
    return this._data.state === GAME_STATES.TERMINATED.CANCELLED;
  }

  isDraw() {
    return this._data.state === GAME_STATES.TERMINATED.DRAW;
  }

  addBlackPlayer(playerId) {
    if (!this.isWaiting() || this._data.blackPlayerId !== null) {
      throw new AppError("The game is not waiting for an opponent", 400, "GAME_NOT_WAITING");
    }
    if (playerId === this._data.whitePlayerId) {
      throw new AppError("A user cannot play against themselves", 400, "SELF_PLAY_NOT_ALLOWED");
    }

    this._data.blackPlayerId = playerId;
    this._data.state = GAME_STATES.ONGOING.WHITE_TURN;

    if (this._data.clock) {
      const now = new Date();
      this._data.clock.turnStartedAt = now.toISOString();
    }
  }

  getLegalMoves(playerId) {
    this._validatePlayerTurn(playerId);
    const board = this._loadBoard();
    const boardMoves = board.moves({ verbose: true });

    return boardMoves.map((move) => {
      return {
        from: move.from,
        to: move.to,
        promotion: move.promotion || null,
        san: move.san,
      };
    });
  }

  makeMove(playerId, from, to, promotion = null) {
    this._validatePlayerTurn(playerId);

    const now = new Date();
    const movingColor = this._getCurrentColor();
    const remainingTime = this._calculateRemainingTime(movingColor, now);
    if (remainingTime !== null && remainingTime <= 0) {
      this._setRemainingTime(movingColor, 0);
      this._finishByTimeout(movingColor);
      return null;
    }

    const board = this._loadBoard();
    const legalMoves = board.moves({ verbose: true });
    const possibleMoves = legalMoves.filter((move) => {
      return move.from === from && move.to === to;
    });

    if (possibleMoves.length === 0) {
      throw new AppError("The requested move is not legal", 400, "ILLEGAL_MOVE", { from, to });
    }

    let selectedPromotion = promotion;
    const isPromotion = possibleMoves.some((move) => move.promotion);
    if (isPromotion && !selectedPromotion) {
      selectedPromotion = "q";
    }
    if (isPromotion && !["q", "r", "b", "n"].includes(selectedPromotion)) {
      throw new AppError("Promotion must be q, r, b, or n", 400, "INVALID_PROMOTION");
    }

    const moveData = { from, to };
    if (selectedPromotion) {
      moveData.promotion = selectedPromotion;
    }

    let appliedMove;
    try {
      appliedMove = board.move(moveData);
    } catch (error) {
      throw new AppError("The requested move is not legal", 400, "ILLEGAL_MOVE", {
        from,
        to,
      });
    }

    if (this._data.clock) {
      this._setRemainingTime(movingColor, remainingTime);
    }

    const uci = `${appliedMove.from}${appliedMove.to}${appliedMove.promotion || ""}`;
    const move = {
      ply: this._data.moves.length + 1,
      uci,
      san: appliedMove.san,
    };
    this._data.moves.push({ uci, san: appliedMove.san });

    this._updateStateAfterMove(board, movingColor);

    if (this._data.clock) {
      if (this.isActive()) {
        this._data.clock.turnStartedAt = now.toISOString();
      } else {
        this._data.clock.turnStartedAt = null;
      }
    }

    return move;
  }

  resign(playerId) {
    if (!this.isActive()) {
      throw new AppError("Only an active game can be resigned", 400, "GAME_NOT_ACTIVE");
    }
    this._validateParticipant(playerId);

    if (playerId === this._data.whitePlayerId) {
      this._data.state = GAME_STATES.TERMINATED.BLACK_WON;
    } else {
      this._data.state = GAME_STATES.TERMINATED.WHITE_WON;
    }

    this._data.endReason = END_REASONS.RESIGNATION;
    if (this._data.clock) {
      this._data.clock.turnStartedAt = null;
    }
  }

  checkTimeout() {
    if (!this.isActive()) {
      throw new AppError("The game is not active", 400, "GAME_NOT_ACTIVE");
    }
    if (!this._data.clock) {
      return false;
    }

    const now = new Date();
    const movingColor = this._getCurrentColor();
    const remainingTime = this._calculateRemainingTime(movingColor, now);
    if (remainingTime > 0) {
      return false;
    }

    this._setRemainingTime(movingColor, 0);
    this._finishByTimeout(movingColor);
    return true;
  }

  cancel() {
    if (!this.isWaiting()) {
      throw new AppError("Only a waiting game can be cancelled", 400, "GAME_NOT_WAITING");
    }
    this._data.state = GAME_STATES.TERMINATED.CANCELLED;
    this._data.endReason = END_REASONS.CANCELLED;
  }

  _updateStateAfterMove(board, movingColor) {
    if (board.isCheckmate()) {
      if (movingColor === "w") {
        this._data.state = GAME_STATES.TERMINATED.WHITE_WON;
      } else {
        this._data.state = GAME_STATES.TERMINATED.BLACK_WON;
      }
      this._data.endReason = END_REASONS.CHECKMATE;
      return;
    }

    if (board.isStalemate()) {
      this._data.state = GAME_STATES.TERMINATED.DRAW;
      this._data.endReason = END_REASONS.STALEMATE;
      return;
    }
    if (board.isThreefoldRepetition()) {
      this._data.state = GAME_STATES.TERMINATED.DRAW;
      this._data.endReason = END_REASONS.REPETITION;
      return;
    }
    if (board.isInsufficientMaterial()) {
      this._data.state = GAME_STATES.TERMINATED.DRAW;
      this._data.endReason = END_REASONS.INSUFFICIENT_MATERIAL;
      return;
    }
    if (board.isDrawByFiftyMoves()) {
      this._data.state = GAME_STATES.TERMINATED.DRAW;
      this._data.endReason = END_REASONS.FIFTY_MOVE_RULE;
      return;
    }
    if (board.isDraw()) {
      this._data.state = GAME_STATES.TERMINATED.DRAW;
      this._data.endReason = END_REASONS.OTHER_DRAW;
      return;
    }

    if (board.turn() === "w") {
      this._data.state = GAME_STATES.ONGOING.WHITE_TURN;
    } else {
      this._data.state = GAME_STATES.ONGOING.BLACK_TURN;
    }
  }

  _finishByTimeout(movingColor) {
    if (movingColor === "w") {
      this._data.state = GAME_STATES.TERMINATED.BLACK_WON;
    } else {
      this._data.state = GAME_STATES.TERMINATED.WHITE_WON;
    }
    this._data.endReason = END_REASONS.TIMEOUT;
    if (this._data.clock) {
      this._data.clock.turnStartedAt = null;
    }
  }

  _getCurrentColor() {
    if (this.isWhiteTurn()) {
      return "w";
    }
    if (this.isBlackTurn()) {
      return "b";
    }
    return null;
  }

  _getCurrentPlayerId() {
    if (this.isWhiteTurn()) {
      return this._data.whitePlayerId;
    }
    if (this.isBlackTurn()) {
      return this._data.blackPlayerId;
    }
    return null;
  }

  _validatePlayerTurn(playerId) {
    if (!this.isActive()) {
      throw new AppError("The game is not active", 400, "GAME_NOT_ACTIVE");
    }
    this._validateParticipant(playerId);
    if (this._getCurrentPlayerId() !== playerId) {
      throw new AppError("It is not this player's turn", 400, "NOT_PLAYER_TURN");
    }
  }

  _validateParticipant(playerId) {
    const isWhite = playerId === this._data.whitePlayerId;
    const isBlack = playerId === this._data.blackPlayerId;
    if (!isWhite && !isBlack) {
      throw new AppError("The user is not a participant in this game", 403, "NOT_GAME_PARTICIPANT");
    }
  }

  _calculateRemainingTime(color, now) {
    if (!this._data.clock) {
      return null;
    }

    let remainingTime = this._data.clock.blackRemainingMs;
    if (color === "w") {
      remainingTime = this._data.clock.whiteRemainingMs;
    }

    if (!this._data.clock.turnStartedAt) {
      return remainingTime;
    }

    const currentTime = now.getTime();
    const turnStartTime = new Date(this._data.clock.turnStartedAt).getTime();
    const elapsedTime = Math.max(0, currentTime - turnStartTime);
    return remainingTime - elapsedTime;
  }

  _setRemainingTime(color, value) {
    if (color === "w") {
      this._data.clock.whiteRemainingMs = value;
    } else {
      this._data.clock.blackRemainingMs = value;
    }
  }

  _loadBoard() {
    const board = new Chess();

    for (const storedMove of this._data.moves) {
      if (!storedMove || typeof storedMove.uci !== "string" || storedMove.uci.length < 4) {
        throw new AppError("The stored move history is invalid", 500, "INVALID_MOVE_HISTORY");
      }

      const moveData = {
        from: storedMove.uci.slice(0, 2),
        to: storedMove.uci.slice(2, 4),
      };
      if (storedMove.uci.length > 4) {
        moveData.promotion = storedMove.uci[4];
      }

      try {
        const appliedMove = board.move(moveData);
        if (storedMove.san && storedMove.san !== appliedMove.san) {
          throw new Error("SAN notation does not match the stored UCI move");
        }
      } catch (error) {
        throw new AppError("The stored move history is invalid", 500, "INVALID_MOVE_HISTORY", {
          uci: storedMove.uci,
        });
      }
    }

    return board;
  }

  getData() {
    const board = this._loadBoard();
    const clock = this._data.clock ? { ...this._data.clock } : null;

    return {
      id: this._data.id,
      whitePlayerId: this._data.whitePlayerId,
      blackPlayerId: this._data.blackPlayerId,
      state: this._data.state,
      moves: this._data.moves.map((move) => ({ ...move })),
      fen: board.fen(),
      ply: this._data.moves.length,
      endReason: this._data.endReason,
      clock,
      currentPlayerId: this._getCurrentPlayerId(),
      winnerId: this.getWinnerId(),
    };
  }
}

module.exports = { Game, GAME_STATES, END_REASONS };
