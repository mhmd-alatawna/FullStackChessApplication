const AppError = require("../../AppError");
const { PLAYER_TYPES } = require("../../../models");

class SequelizeSessionsRepository {
  constructor(models, transaction = null) {
    this.models = models;
    this.transaction = transaction;
  }

  async create(token, userId) {
    const playerId = String(userId);
    const player = await this.models.Player.findByPk(playerId, {
      transaction: this.transaction,
    });
    if (!player || player.type === PLAYER_TYPES.AGENT) {
      throw new AppError("Automated users cannot create sessions", 401, "INVALID_CREDENTIALS");
    }
    await this.models.Session.create({ token, playerId }, { transaction: this.transaction });
    return true;
  }

  async findUserId(token) {
    const session = await this.models.Session.findByPk(token, { transaction: this.transaction });
    if (!session) {
      return null;
    }
    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
      await session.destroy({ transaction: this.transaction });
      return null;
    }
    return session.playerId;
  }

  async delete(token) {
    const deleted = await this.models.Session.destroy({
      where: { token },
      transaction: this.transaction,
    });
    return deleted > 0;
  }
}

module.exports = SequelizeSessionsRepository;
