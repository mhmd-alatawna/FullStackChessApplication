const { literal } = require("sequelize");
const AppError = require("../../src/AppError");
const { Game } = require("../../models/Game");

const loadedGameVersions = new WeakMap();

class SequelizeGamesRepository {
  constructor(sequelize, models, transaction = null) {
    this.sequelize = sequelize;
    this.models = models;
    this.transaction = transaction;
  }

  async findById(id) {
    const row = await this.models.Game.findByPk(String(id), {
      include: [
        { model: this.models.GameParticipant, as: "participants" },
        { model: this.models.GameMove, as: "moves" },
      ],
      order: [[{ model: this.models.GameMove, as: "moves" }, "ply", "ASC"]],
      transaction: this.transaction,
    });
    if (!row) {
      return null;
    }
    return this._createGame(row);
  }

  async findAll() {
    const rows = await this.models.Game.findAll({
      include: [
        { model: this.models.GameParticipant, as: "participants" },
        { model: this.models.GameMove, as: "moves" },
      ],
      order: [[{ model: this.models.GameMove, as: "moves" }, "ply", "ASC"]],
      transaction: this.transaction,
    });
    return rows.map((row) => this._createGame(row));
  }

  async findByPlayerId(playerId) {
    const rows = await this.models.Game.findAll({
      include: [
        {
          model: this.models.GameParticipant,
          as: "participantFilter",
          where: { playerId: String(playerId) },
          attributes: [],
          required: true,
        },
        { model: this.models.GameParticipant, as: "participants" },
        { model: this.models.GameMove, as: "moves" },
      ],
      order: [[{ model: this.models.GameMove, as: "moves" }, "ply", "ASC"]],
      transaction: this.transaction,
    });
    return rows.map((row) => this._createGame(row));
  }

  async create(game) {
    const gameData = game.getData();
    const createGame = async (transaction) => {
      const existingGame = await this.models.Game.findByPk(String(gameData.id), { transaction });
      if (existingGame) {
        throw new AppError("The game already exists", 409, "GAME_ALREADY_EXISTS", { gameId: gameData.id });
      }

      await this.models.Game.create({
        id: String(gameData.id),
        state: gameData.state,
        endReason: gameData.endReason,
        durationMinutes: gameData.clock ? gameData.clock.durationMinutes : null,
        whiteRemainingMs: gameData.clock ? Math.max(0, Math.round(gameData.clock.whiteRemainingMs)) : null,
        blackRemainingMs: gameData.clock ? Math.max(0, Math.round(gameData.clock.blackRemainingMs)) : null,
        turnStartedAt: gameData.clock ? gameData.clock.turnStartedAt : null,
      }, { transaction });

      const participants = [{
        gameId: String(gameData.id),
        playerId: String(gameData.whitePlayerId),
        color: "white",
      }];
      if (gameData.blackPlayerId !== null) {
        participants.push({
          gameId: String(gameData.id),
          playerId: String(gameData.blackPlayerId),
          color: "black",
        });
      }
      await this.models.GameParticipant.bulkCreate(participants, { transaction });
      await this._insertMoves(gameData, 0, transaction);
      loadedGameVersions.set(game, 0);
      return true;
    };

    if (this.transaction) {
      return createGame(this.transaction);
    }
    return this.sequelize.transaction(createGame);
  }

  async update(game) {
    const gameData = game.getData();
    const gameId = String(gameData.id);
    const loadedVersion = loadedGameVersions.get(game);
    if (loadedVersion === undefined) {
      throw new AppError("The game was not loaded by this repository", 409, "GAME_CONFLICT", { gameId });
    }

    const updateGame = async (transaction) => {
      const [updatedRows] = await this.models.Game.update({
        state: gameData.state,
        endReason: gameData.endReason,
        durationMinutes: gameData.clock ? gameData.clock.durationMinutes : null,
        whiteRemainingMs: gameData.clock ? Math.max(0, Math.round(gameData.clock.whiteRemainingMs)) : null,
        blackRemainingMs: gameData.clock ? Math.max(0, Math.round(gameData.clock.blackRemainingMs)) : null,
        turnStartedAt: gameData.clock ? gameData.clock.turnStartedAt : null,
        version: literal("version + 1"),
      }, {
        where: { id: gameId, version: loadedVersion },
        transaction,
      });
      if (updatedRows !== 1) {
        throw new AppError(
          "The game changed while this action was being processed",
          409,
          "GAME_CONFLICT",
          { gameId },
        );
      }

      const storedMoveCount = await this.models.GameMove.count({ where: { gameId }, transaction });
      if (storedMoveCount > gameData.moves.length) {
        throw new AppError("Stored game moves are inconsistent", 500, "INVALID_MOVE_HISTORY", { gameId });
      }
      await this._insertMoves(gameData, storedMoveCount, transaction);
      loadedGameVersions.set(game, loadedVersion + 1);
      return true;
    };

    if (this.transaction) {
      return updateGame(this.transaction);
    }
    return this.sequelize.transaction(updateGame);
  }

  async delete(id) {
    const deletedRows = await this.models.Game.destroy({
      where: { id: String(id) },
      transaction: this.transaction,
    });
    return deletedRows > 0;
  }

  _createGame(row) {
    const storedGame = row.get({ plain: true });
    const whitePlayer = storedGame.participants.find((participant) => participant.color === "white");
    const blackPlayer = storedGame.participants.find((participant) => participant.color === "black");
    if (!whitePlayer) {
      throw new AppError("A persisted game requires a white participant", 500, "GAME_STATE_MISMATCH");
    }

    let clock = null;
    if (storedGame.durationMinutes !== null) {
      clock = {
        durationMinutes: Number(storedGame.durationMinutes),
        whiteRemainingMs: Number(storedGame.whiteRemainingMs),
        blackRemainingMs: Number(storedGame.blackRemainingMs),
        turnStartedAt: storedGame.turnStartedAt ? new Date(storedGame.turnStartedAt).toISOString() : null,
      };
    }

    const game = new Game({
      id: storedGame.id,
      whitePlayerId: whitePlayer.playerId,
      blackPlayerId: blackPlayer ? blackPlayer.playerId : null,
      state: storedGame.state,
      moves: storedGame.moves.map((move) => ({ uci: move.uci, san: move.san })),
      endReason: storedGame.endReason,
      clock,
    });
    loadedGameVersions.set(game, Number(storedGame.version));
    return game;
  }

  async _insertMoves(gameData, startIndex, transaction) {
    const newMoves = gameData.moves.slice(startIndex).map((move, index) => ({
      gameId: String(gameData.id),
      ply: startIndex + index + 1,
      uci: move.uci,
      san: move.san,
    }));
    if (newMoves.length > 0) {
      await this.models.GameMove.bulkCreate(newMoves, { transaction });
    }
  }
}

module.exports = SequelizeGamesRepository;
