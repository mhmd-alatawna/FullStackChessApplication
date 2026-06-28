const { Op, UniqueConstraintError } = require("sequelize");
const AppError = require("../../AppError");

class SequelizeMatchmakingRepository {
  constructor(sequelize, models, transaction = null) {
    this.sequelize = sequelize;
    this.models = models;
    this.transaction = transaction;
  }

  async findByUserId(userId) {
    const ticket = await this.models.MatchmakingTicket.findOne({
      where: { playerId: String(userId) },
      transaction: this.transaction,
    });
    if (!ticket) {
      return null;
    }
    return this._createTicket(ticket);
  }

  async takeWaiting(durationMinutes, excludedUserId) {
    const takeTicket = async (transaction) => {
      const ticket = await this.models.MatchmakingTicket.findOne({
        where: {
          durationMinutes,
          playerId: { [Op.ne]: String(excludedUserId) },
        },
        order: [["createdAt", "ASC"]],
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
        transaction,
      });
      if (!ticket) {
        return null;
      }

      const ticketData = this._createTicket(ticket);
      await ticket.destroy({ transaction });
      return ticketData;
    };

    if (this.transaction) {
      return takeTicket(this.transaction);
    }
    return this.sequelize.transaction(takeTicket);
  }

  async create(ticket) {
    try {
      await this.models.MatchmakingTicket.create({
        id: String(ticket.id),
        playerId: String(ticket.userId),
        durationMinutes: ticket.durationMinutes,
        createdAt: ticket.createdAt,
      }, { transaction: this.transaction });
      return true;
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new AppError("The user is already queued", 409, "USER_ALREADY_QUEUED");
      }
      throw error;
    }
  }

  async delete(ticketId) {
    const deletedRows = await this.models.MatchmakingTicket.destroy({
      where: { id: String(ticketId) },
      transaction: this.transaction,
    });
    return deletedRows > 0;
  }

  _createTicket(row) {
    return {
      id: row.id,
      userId: row.playerId,
      durationMinutes: Number(row.durationMinutes),
      createdAt: row.createdAt.toISOString(),
    };
  }
}

module.exports = SequelizeMatchmakingRepository;
