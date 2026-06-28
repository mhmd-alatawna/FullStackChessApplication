const { DataTypes } = require("sequelize");

module.exports = function defineAgent(sequelize) {
  return sequelize.define("Agent", {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    playerId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: "player_id" },
    strategy: { type: DataTypes.STRING(64), allowNull: false },
    difficulty: { type: DataTypes.STRING(32), allowNull: false },
    config: { type: DataTypes.JSON, allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
    updatedAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
  }, { underscored: true, tableName: "agents" });
};
