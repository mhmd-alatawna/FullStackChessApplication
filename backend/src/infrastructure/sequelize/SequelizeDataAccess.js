const { randomUUID } = require("node:crypto");
const { assertDataAccess } = require("../contracts/DataAccessContract");
const { defineModels } = require("../../../models");
const MigrationRunner = require("../../../migrations/MigrationRunner");
const ensureInitialData = require("../../../seeders/ensureInitialData");
const { authenticateOrCreate, createSequelize } = require("./connection");
const SequelizeUsersRepository = require("../repositories/SequelizeUsersRepository");
const SequelizeGamesRepository = require("../repositories/SequelizeGamesRepository");
const SequelizeSessionsRepository = require("../repositories/SequelizeSessionsRepository");
const SequelizeMatchmakingRepository = require("../repositories/SequelizeMatchmakingRepository");
const SequelizeAgentsRepository = require("../repositories/SequelizeAgentsRepository");

class SequelizeDataAccess {
  constructor(config) {
    this.config = config;
    this.sequelize = createSequelize(config);
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
    await authenticateOrCreate(this.sequelize, this.config);
    await new MigrationRunner(this.sequelize).up();
    await ensureInitialData(this.sequelize, this.models);
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
}

module.exports = SequelizeDataAccess;
