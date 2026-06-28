const AppError = require("../../AppError");
const { Op } = require("sequelize");
const { User, USER_ROLES } = require("../../models/User");
const { PLAYER_TYPES } = require("../../../models");

class SequelizeUsersRepository {
  constructor(sequelize, models, transaction = null) {
    this.sequelize = sequelize;
    this.models = models;
    this.transaction = transaction;
  }

  async findById(id) {
    const player = await this.models.Player.findByPk(String(id), {
      include: [
        { model: this.models.NormalUser, as: "normalUser" },
        { model: this.models.AdminUser, as: "adminUser" },
        { model: this.models.Agent, as: "agent" },
      ],
      transaction: this.transaction,
    });
    if (!player) {
      return null;
    }
    return this._createUser(player);
  }

  async findByName(firstName, lastName) {
    const players = await this.models.Player.findAll({
      where: { firstName, lastName },
      include: [
        { model: this.models.NormalUser, as: "normalUser" },
        { model: this.models.AdminUser, as: "adminUser" },
        { model: this.models.Agent, as: "agent" },
      ],
      transaction: this.transaction,
    });
    return players.map((player) => this._createUser(player));
  }

  async findByEmail(email) {
    const player = await this.models.Player.findOne({
      where: { email: String(email).trim().toLowerCase() },
      include: [
        { model: this.models.NormalUser, as: "normalUser" },
        { model: this.models.AdminUser, as: "adminUser" },
        { model: this.models.Agent, as: "agent" },
      ],
      transaction: this.transaction,
    });
    return player ? this._createUser(player) : null;
  }

  async findNamesByIds(ids) {
    const players = await this.models.Player.findAll({
      attributes: ["id", "firstName", "lastName"],
      where: { id: { [Op.in]: ids.map(String) } },
      transaction: this.transaction,
    });
    const names = {};
    for (const player of players) {
      names[player.id] = `${player.firstName} ${player.lastName}`;
    }
    return names;
  }

  async findAll() {
    const players = await this.models.Player.findAll({
      include: [
        { model: this.models.NormalUser, as: "normalUser" },
        { model: this.models.AdminUser, as: "adminUser" },
        { model: this.models.Agent, as: "agent" },
      ],
      transaction: this.transaction,
    });
    return players.map((player) => this._createUser(player));
  }

  async create(user) {
    const userData = user.getData(true);
    if (userData.isAutomated) {
      throw new AppError("Automated users must be created as agents", 400, "INVALID_USER_TYPE");
    }
    if (await this.models.Player.findByPk(String(userData.id), { transaction: this.transaction })) {
      return false;
    }

    const createUser = async (transaction) => {
      const playerType = userData.role === USER_ROLES.ADMIN ? PLAYER_TYPES.ADMIN : PLAYER_TYPES.NORMAL_USER;
      await this.models.Player.create({
        id: String(userData.id),
        type: playerType,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        theme: userData.theme,
        wins: userData.wins,
        losses: userData.losses,
        draws: userData.draws,
        elo: userData.elo,
      }, { transaction });

      if (playerType === PLAYER_TYPES.ADMIN) {
        await this.models.AdminUser.create({
          playerId: String(userData.id),
          password: userData.password,
        }, { transaction });
      } else {
        await this.models.NormalUser.create({
          playerId: String(userData.id),
          password: userData.password,
          role: userData.role,
        }, { transaction });
      }
      return true;
    };

    if (this.transaction) {
      return createUser(this.transaction);
    }
    return this.sequelize.transaction(createUser);
  }

  async update(user) {
    const userData = user.getData(true);
    const player = await this.models.Player.findByPk(String(userData.id), {
      transaction: this.transaction,
    });
    if (!player) {
      throw new AppError("The user was not found", 404, "USER_NOT_FOUND", { userId: userData.id });
    }

    const updateUser = async (transaction) => {
      await player.update({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        theme: userData.theme,
        wins: userData.wins,
        losses: userData.losses,
        draws: userData.draws,
        elo: userData.elo,
      }, { transaction });

      if (player.type === PLAYER_TYPES.ADMIN) {
        if (userData.role !== USER_ROLES.ADMIN) {
          throw new AppError("Accounts cannot transition between normal-user and admin tables", 400, "INVALID_ROLE_TRANSITION");
        }
        await this.models.AdminUser.update(
          { password: userData.password },
          { where: { playerId: userData.id }, transaction },
        );
      } else if (player.type === PLAYER_TYPES.NORMAL_USER) {
        if (userData.role === USER_ROLES.ADMIN) {
          throw new AppError("Accounts cannot transition between normal-user and admin tables", 400, "INVALID_ROLE_TRANSITION");
        }
        await this.models.NormalUser.update(
          { password: userData.password, role: userData.role },
          { where: { playerId: userData.id }, transaction },
        );
      } else if (!userData.isAutomated) {
        throw new AppError("The player type cannot be changed", 400, "INVALID_USER_TYPE");
      }
      return true;
    };

    if (this.transaction) {
      return updateUser(this.transaction);
    }
    return this.sequelize.transaction(updateUser);
  }

  async delete(id) {
    const playerId = String(id);
    const deleteUser = async (transaction) => {
      const player = await this.models.Player.findByPk(playerId, { transaction });
      if (!player) {
        return false;
      }
      const gameCount = await this.models.GameParticipant.count({ where: { playerId }, transaction });
      if (gameCount > 0) {
        throw new AppError("A player with game history cannot be deleted", 409, "USER_HAS_GAMES", { userId: playerId });
      }
      await player.destroy({ transaction });
      return true;
    };

    if (this.transaction) {
      return deleteUser(this.transaction);
    }
    return this.sequelize.transaction(deleteUser);
  }

  _createUser(row) {
    const player = row.get({ plain: true });
    const userData = {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      email: player.email,
      theme: player.theme,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws,
      elo: player.elo,
    };

    if (player.type === PLAYER_TYPES.NORMAL_USER && player.normalUser) {
      return new User({
        ...userData,
        password: player.normalUser.password,
        role: player.normalUser.role,
      });
    }
    if (player.type === PLAYER_TYPES.ADMIN && player.adminUser) {
      return new User({ ...userData, password: player.adminUser.password, role: USER_ROLES.ADMIN });
    }
    if (player.type === PLAYER_TYPES.AGENT && player.agent) {
      return new User({ ...userData, password: "disabled", role: USER_ROLES.USER, isAutomated: true });
    }
    throw new AppError("The player subtype is missing", 500, "INVALID_PLAYER_TYPE", { playerId: player.id });
  }
}

module.exports = SequelizeUsersRepository;
