class SequelizeAgentsRepository {
  constructor(models, transaction = null) {
    this.models = models;
    this.transaction = transaction;
  }

  async findById(id) {
    const row = await this.models.Agent.findByPk(String(id), {
      include: [{ model: this.models.Player, as: "player", required: true }],
      transaction: this.transaction,
    });
    return row ? this._createAgentData(row) : null;
  }

  async findByUserId(userId) {
    const row = await this.models.Agent.findOne({
      where: { playerId: String(userId) },
      include: [{ model: this.models.Player, as: "player", required: true }],
      transaction: this.transaction,
    });
    return row ? this._createAgentData(row) : null;
  }

  async findAll() {
    const rows = await this.models.Agent.findAll({
      include: [{ model: this.models.Player, as: "player", required: true }],
      transaction: this.transaction,
    });
    return rows.map((row) => this._createAgentData(row));
  }

  _createAgentData(row) {
    let configuration = row.config;
    if (typeof configuration === "string") {
      configuration = JSON.parse(configuration);
    }
    return {
      id: row.id,
      userId: row.playerId,
      name: `${row.player.firstName} ${row.player.lastName}`,
      elo: row.player.elo,
      strategy: row.strategy,
      difficulty: row.difficulty,
      enabled: row.enabled,
      config: configuration || undefined,
    };
  }
}

module.exports = SequelizeAgentsRepository;
