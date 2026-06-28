const { GAME_STATES } = require("../models/Game");

class GameTimeoutScheduler {
  constructor(gamesUseCases, onGameFinished, logger) {
    this.gamesUseCases = gamesUseCases;
    this.onGameFinished = onGameFinished;
    this.logger = logger;
    this.timers = new Map();
  }

  async restore() {
    const games = await this.gamesUseCases.getAllGames();
    for (const gameData of games) {
      this.resume(gameData);
    }
  }

  start(gameData) {
    this.resume(gameData);
  }

  pause(gameId, playerId) {
    const timerKey = this._getTimerKey(gameId, playerId);
    const timer = this.timers.get(timerKey);
    if (!timer) {
      return false;
    }
    clearTimeout(timer);
    this.timers.delete(timerKey);
    return true;
  }

  resume(gameData) {
    this.cancel(gameData.id);

    if (!gameData.clock || !this._isActive(gameData)) {
      return;
    }

    let playerId = gameData.blackPlayerId;
    let remainingMs = gameData.clock.blackRemainingMs;
    if (gameData.state === GAME_STATES.ONGOING.WHITE_TURN) {
      playerId = gameData.whitePlayerId;
      remainingMs = gameData.clock.whiteRemainingMs;
    }

    const turnStartedAt = new Date(gameData.clock.turnStartedAt).getTime();
    const elapsedMs = Math.max(0, Date.now() - turnStartedAt);
    const delayMs = Math.max(0, remainingMs - elapsedMs);
    const timerKey = this._getTimerKey(gameData.id, playerId);

    const timer = setTimeout(() => {
      this._handleTimeout(gameData.id, playerId);
    }, delayMs);
    timer.unref();
    this.timers.set(timerKey, timer);
  }

  cancel(gameId, playerId = null) {
    if (playerId !== null) {
      return this.pause(gameId, playerId);
    }

    let cancelled = false;
    const gamePrefix = `${gameId}:`;
    for (const [timerKey, timer] of this.timers.entries()) {
      if (timerKey.startsWith(gamePrefix)) {
        clearTimeout(timer);
        this.timers.delete(timerKey);
        cancelled = true;
      }
    }
    return cancelled;
  }

  stop() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  async _handleTimeout(gameId, playerId) {
    this.timers.delete(this._getTimerKey(gameId, playerId));

    try {
      const result = await this.gamesUseCases.checkTimeout(gameId, playerId);
      if (result.expired) {
        this.onGameFinished(result.game);
        return;
      }
      this.resume(result.game);
    } catch (error) {
      this.logger.error(`Failed to process timeout for game ${gameId}: ${error.stack || error.message}`);
    }
  }

  _isActive(game) {
    return game.state === GAME_STATES.ONGOING.WHITE_TURN ||
      game.state === GAME_STATES.ONGOING.BLACK_TURN;
  }

  _getTimerKey(gameId, playerId) {
    return `${gameId}:${playerId}`;
  }
}

module.exports = GameTimeoutScheduler;
