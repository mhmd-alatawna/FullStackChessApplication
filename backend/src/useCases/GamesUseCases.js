const AppError = require("../AppError");
const { User, GAME_RESULTS } = require("../models/User");

class GamesUseCases {
  constructor(dataAccess) {
    this.dataAccess = dataAccess;
    this.games = dataAccess.games;
    this.users = dataAccess.users;
  }

  async getGame(gameId) {
    const game = await this.games.findById(gameId);
    if (!game) {
      throw new AppError("The game was not found", 404, "GAME_NOT_FOUND", { gameId });
    }
    const games = await this._addPlayerNames([game.getData()], this.users);
    return games[0];
  }

  async getLegalMoves(gameId, playerId) {
    const game = await this.games.findById(gameId);
    if (!game) {
      throw new AppError("The game was not found", 404, "GAME_NOT_FOUND", { gameId });
    }
    return game.getLegalMoves(playerId);
  }

  async makeMove(gameId, playerId, moveData) {
    if (!moveData || typeof moveData !== "object") {
      throw new AppError("Move data is required", 400, "VALIDATION_ERROR");
    }

    return this.dataAccess.transaction(async (dataAccess) => {
      const game = await dataAccess.games.findById(gameId);
      if (!game) {
        throw new AppError("The game was not found", 404, "GAME_NOT_FOUND", { gameId });
      }

      const move = game.makeMove(playerId, moveData.from, moveData.to, moveData.promotion);
      await dataAccess.games.update(game);

      if (game.isFinished() && !game.isCancelled()) {
        await this._updatePlayerStatistics(game, dataAccess.users);
      }

      const games = await this._addPlayerNames([game.getData()], dataAccess.users);
      return {
        game: games[0],
        move,
      };
    });
  }

  async resignGame(gameId, playerId) {
    return this.dataAccess.transaction(async (dataAccess) => {
      const game = await dataAccess.games.findById(gameId);
      if (!game) {
        throw new AppError("The game was not found", 404, "GAME_NOT_FOUND", { gameId });
      }

      game.resign(playerId);
      await dataAccess.games.update(game);
      await this._updatePlayerStatistics(game, dataAccess.users);
      const games = await this._addPlayerNames([game.getData()], dataAccess.users);
      return games[0];
    });
  }

  async checkTimeout(gameId, expectedPlayerId = null) {
    return this.dataAccess.transaction(async (dataAccess) => {
      const game = await dataAccess.games.findById(gameId);
      if (!game) {
        throw new AppError("The game was not found", 404, "GAME_NOT_FOUND", { gameId });
      }

      if (expectedPlayerId && game.getActivePlayerId() !== expectedPlayerId) {
        const games = await this._addPlayerNames([game.getData()], dataAccess.users);
        return {
          expired: false,
          game: games[0],
        };
      }

      const expired = game.checkTimeout();
      if (!expired) {
        const games = await this._addPlayerNames([game.getData()], dataAccess.users);
        return {
          expired: false,
          game: games[0],
        };
      }

      await dataAccess.games.update(game);
      await this._updatePlayerStatistics(game, dataAccess.users);
      const games = await this._addPlayerNames([game.getData()], dataAccess.users);
      return {
        expired: true,
        game: games[0],
      };
    });
  }

  async getGamesForUser(userId) {
    const games = await this.games.findByPlayerId(userId);
    return this._addPlayerNames(games.map((game) => game.getData()), this.users);
  }

  async getAllGames() {
    const games = await this.games.findAll();
    return this._addPlayerNames(games.map((game) => game.getData()), this.users);
  }

  async deleteGame(gameId) {
    const deleted = await this.games.delete(gameId);
    if (!deleted) {
      throw new AppError("The game was not found", 404, "GAME_NOT_FOUND", { gameId });
    }
    return true;
  }

  async _updatePlayerStatistics(game, usersRepository) {
    const playerIds = game.getPlayerIds();
    const whitePlayer = await usersRepository.findById(playerIds[0]);
    const blackPlayer = await usersRepository.findById(playerIds[1]);

    if (!whitePlayer || !blackPlayer) {
      throw new AppError("Both game players must exist", 500, "GAME_PLAYER_NOT_FOUND");
    }

    let whiteResult = GAME_RESULTS.DRAW;
    let blackResult = GAME_RESULTS.DRAW;
    let whiteScore = 0.5;

    if (!game.isDraw()) {
      if (game.getWinnerId() === whitePlayer.getId()) {
        whiteResult = GAME_RESULTS.WIN;
        blackResult = GAME_RESULTS.LOSS;
        whiteScore = 1;
      } else {
        whiteResult = GAME_RESULTS.LOSS;
        blackResult = GAME_RESULTS.WIN;
        whiteScore = 0;
      }
    }

    const eloChanges = User.calculateEloChanges(
      whitePlayer.getElo(),
      blackPlayer.getElo(),
      whiteScore,
    );

    whitePlayer.recordGameResult(whiteResult, eloChanges.firstPlayerChange);
    blackPlayer.recordGameResult(blackResult, eloChanges.secondPlayerChange);
    await usersRepository.update(whitePlayer);
    await usersRepository.update(blackPlayer);
  }

  async _addPlayerNames(games, usersRepository) {
    const playerIds = new Set();
    for (const game of games) {
      playerIds.add(game.whitePlayerId);
      if (game.blackPlayerId) {
        playerIds.add(game.blackPlayerId);
      }
    }
    const names = await usersRepository.findNamesByIds([...playerIds]);
    return games.map((game) => ({
      ...game,
      whitePlayerName: names[game.whitePlayerId] || "Unknown player",
      blackPlayerName: game.blackPlayerId ? names[game.blackPlayerId] || "Unknown player" : null,
    }));
  }
}

module.exports = GamesUseCases;
