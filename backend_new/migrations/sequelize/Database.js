const { randomUUID } = require("node:crypto");
const { Sequelize } = require("sequelize");
const { assertDataAccess } = require("../contracts/DataAccessContract");
const { defineModels } = require("./models");
const SequelizeUsersRepository = require("../repositories/SequelizeUsersRepository");
const SequelizeGamesRepository = require("../repositories/SequelizeGamesRepository");
const SequelizeSessionsRepository = require("../repositories/SequelizeSessionsRepository");
const SequelizeMatchmakingRepository = require("../repositories/SequelizeMatchmakingRepository");
const SequelizeAgentsRepository = require("../repositories/SequelizeAgentsRepository");

class Database {
  constructor(config) {
    this.config = config;
    this.sequelize = new Sequelize(
      config.database_name,
      config.database_user,
      config.database_password,
      {
        dialect: config.database_type,
        host: config.database_location,
        port: config.database_port,
        logging: false,
        define: { underscored: true, freezeTableName: true },
      },
    );
    this.models = defineModels(this.sequelize);
    this.ids = {
      async next() {
        return randomUUID();
      },
    };

    const repositories = this._createRepositories();
    this.users = repositories.users;
    this.games = repositories.games;
    this.sessions = repositories.sessions;
    this.matchmaking = repositories.matchmaking;
    this.agents = repositories.agents;
    assertDataAccess(this);
  }

  async initialize() {
    try {
      await this.sequelize.authenticate();
    } catch (error) {
      if (error.original?.code !== "ER_BAD_DB_ERROR") {
        throw error;
      }
      await this._createDatabase();
    }

    await this.sequelize.sync({ alter: true });
    await this._addInitialData();
  }

  async _createDatabase() {
    const serverConnection = new Sequelize("", this.config.database_user, this.config.database_password, {
      dialect: this.config.database_type,
      host: this.config.database_location,
      port: this.config.database_port,
      logging: false,
    });
    const databaseName = serverConnection.getQueryInterface().queryGenerator.quoteIdentifier(
      this.config.database_name,
    );

    try {
      await serverConnection.query(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
    } finally {
      await serverConnection.close();
    }
  }

  async close() {
    await this.sequelize.close();
  }

  async transaction(work) {
    return this.sequelize.transaction(async (transaction) => {
      const repositories = this._createRepositories(transaction);
      return work({ ...repositories, ids: this.ids });
    });
  }

  _createRepositories(transaction = null) {
    return {
      users: new SequelizeUsersRepository(this.sequelize, this.models, transaction),
      games: new SequelizeGamesRepository(this.sequelize, this.models, transaction),
      sessions: new SequelizeSessionsRepository(this.models, transaction),
      matchmaking: new SequelizeMatchmakingRepository(this.sequelize, this.models, transaction),
      agents: new SequelizeAgentsRepository(this.models, transaction),
    };
  }

  async _addInitialData() {
    if (await this.models.Player.count() > 0) {
      await this._addMissingDefaultAgents();
      await this._addDefaultUserSettings();
      return;
    }

    await this.sequelize.transaction(async (transaction) => {
      await this.models.Player.bulkCreate([
        { id: "1", type: "admin", firstName: "Admin", lastName: "User", email: "admin@chessgrove.local", theme: "dark", elo: 1200 },
        { id: "2", type: "normal_user", firstName: "Manager", lastName: "User", email: "manager@chessgrove.local", theme: "dark", elo: 1200 },
        { id: "3", type: "normal_user", firstName: "Regular", lastName: "User", email: "player@chessgrove.local", theme: "dark", elo: 1200 },
        { id: "agent-random", type: "agent", firstName: "Random", lastName: "Bot", elo: 1200 },
        { id: "agent-heuristic", type: "agent", firstName: "Heuristic", lastName: "Bot", elo: 1450 },
        { id: "agent-monte-carlo", type: "agent", firstName: "Monte Carlo", lastName: "Bot", elo: 1600 },
        { id: "agent-strong-search", type: "agent", firstName: "Strong Search", lastName: "Bot", elo: 2000 },
        { id: "agent-uci", type: "agent", firstName: "Local UCI", lastName: "Engine", elo: 2400 },
        { id: "agent-remote", type: "agent", firstName: "Remote", lastName: "Engine", elo: 2400 },
      ], { transaction });
      await this.models.AdminUser.create({ playerId: "1", password: "admin123" }, { transaction });
      await this.models.NormalUser.bulkCreate([
        { playerId: "2", password: "manager123", role: "manager" },
        { playerId: "3", password: "player123", role: "user" },
      ], { transaction });
      await this.models.Agent.bulkCreate([
        { id: "random", playerId: "agent-random", strategy: "random", difficulty: "beginner", config: null, enabled: true },
        { id: "heuristic", playerId: "agent-heuristic", strategy: "heuristic", difficulty: "intermediate", config: null, enabled: true },
        { id: "monte-carlo", playerId: "agent-monte-carlo", strategy: "monte-carlo", difficulty: "advanced", config: { rolloutDepth: 14, exploration: 1.25 }, enabled: true },
        { id: "strong-search", playerId: "agent-strong-search", strategy: "strong-search", difficulty: "expert", config: null, enabled: true },
        { id: "uci", playerId: "agent-uci", strategy: "uci", difficulty: "engine", config: null, enabled: true },
        { id: "remote", playerId: "agent-remote", strategy: "remote", difficulty: "engine", config: null, enabled: true },
      ], { transaction });
    });
  }

  async _addMissingDefaultAgents() {
    const agents = [
      { id: "heuristic", playerId: "agent-heuristic", firstName: "Heuristic", lastName: "Bot", strategy: "heuristic", difficulty: "intermediate", elo: 1450 },
      { id: "strong-search", playerId: "agent-strong-search", firstName: "Strong Search", lastName: "Bot", strategy: "strong-search", difficulty: "expert", elo: 2000 },
      { id: "uci", playerId: "agent-uci", firstName: "Local UCI", lastName: "Engine", strategy: "uci", difficulty: "engine", elo: 2400 },
      { id: "remote", playerId: "agent-remote", firstName: "Remote", lastName: "Engine", strategy: "remote", difficulty: "engine", elo: 2400 },
    ];
    await this.sequelize.transaction(async (transaction) => {
      for (const agent of agents) {
        await this.models.Player.findOrCreate({
          where: { id: agent.playerId },
          defaults: { type: "agent", firstName: agent.firstName, lastName: agent.lastName, elo: agent.elo },
          transaction,
        });
        await this.models.Agent.findOrCreate({
          where: { id: agent.id },
          defaults: { playerId: agent.playerId, strategy: agent.strategy, difficulty: agent.difficulty, config: null, enabled: true },
          transaction,
        });
      }
    });
  }

  async _addDefaultUserSettings() {
    const defaults = [
      { id: "1", email: "admin@chessgrove.local", password: "admin123", previousPassword: "admin", admin: true },
      { id: "2", email: "manager@chessgrove.local", password: "manager123", previousPassword: "manager", admin: false },
      { id: "3", email: "player@chessgrove.local", password: "player123", previousPassword: "user", admin: false },
    ];
    await this.sequelize.transaction(async (transaction) => {
      for (const account of defaults) {
        const player = await this.models.Player.findByPk(account.id, { transaction });
        if (!player) continue;
        if (!player.email) await player.update({ email: account.email, theme: "dark" }, { transaction });

        const model = account.admin ? this.models.AdminUser : this.models.NormalUser;
        const subtype = await model.findByPk(account.id, { transaction });
        if (subtype?.password === account.previousPassword) {
          await subtype.update({ password: account.password }, { transaction });
        }
      }
    });
  }
}

module.exports = Database;
