const fs = require("node:fs");
const path = require("node:path");
const { DataTypes } = require("sequelize");

function normalizeTableName(table) {
  if (typeof table === "string") return table;
  return table.tableName || table.table_name || Object.values(table)[0];
}

class MigrationRunner {
  constructor(sequelize, schemaDirectory = path.join(__dirname, "schema")) {
    this.sequelize = sequelize;
    this.schemaDirectory = schemaDirectory;
  }

  async status() {
    const metadata = await this._metadataModel();
    const appliedNames = await this._appliedNames(metadata);
    return this._migrations().map(({ name }) => ({
      name,
      state: appliedNames.has(name) ? "applied" : "pending",
    }));
  }

  async up() {
    const metadata = await this._metadataModel();
    const appliedNames = await this._appliedNames(metadata);
    const applied = [];

    for (const { name, migration } of this._migrations()) {
      if (appliedNames.has(name)) continue;
      await migration.up(this.sequelize.getQueryInterface());
      await metadata.create({ name });
      applied.push(name);
    }

    return applied;
  }

  async down() {
    const metadata = await this._metadataModel();
    const latest = await metadata.findOne({ order: [["name", "DESC"]], raw: true });
    if (!latest) return null;

    const entry = this._migrations().find(({ name }) => name === latest.name);
    if (!entry) throw new Error(`Cannot undo missing migration file: ${latest.name}`);

    await entry.migration.down(this.sequelize.getQueryInterface());
    await metadata.destroy({ where: { name: latest.name } });
    return latest.name;
  }

  _migrations() {
    return fs.readdirSync(this.schemaDirectory)
      .filter((fileName) => fileName.endsWith(".js"))
      .sort()
      .map((fileName) => ({
        name: fileName,
        migration: require(path.join(this.schemaDirectory, fileName)),
      }));
  }

  async _metadataModel() {
    const queryInterface = this.sequelize.getQueryInterface();
    const tables = (await queryInterface.showAllTables()).map(normalizeTableName);
    if (!tables.includes("SequelizeMeta")) {
      await queryInterface.createTable("SequelizeMeta", {
        name: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
      });
    }

    return this.sequelize.models.SequelizeMeta || this.sequelize.define("SequelizeMeta", {
      name: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
    }, {
      tableName: "SequelizeMeta",
      timestamps: false,
    });
  }

  async _appliedNames(metadata) {
    const rows = await metadata.findAll({ attributes: ["name"], order: [["name", "ASC"]], raw: true });
    return new Set(rows.map((row) => row.name));
  }
}

module.exports = MigrationRunner;
