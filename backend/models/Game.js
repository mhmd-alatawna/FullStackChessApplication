const { DataTypes } = require("sequelize");
const { GAME_STATES, GAME_END_REASONS } = require("./constants");

module.exports = function defineGame(sequelize) {
  return sequelize.define("Game", {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    state: { type: DataTypes.ENUM(...GAME_STATES), allowNull: false },
    endReason: { type: DataTypes.ENUM(...GAME_END_REASONS), allowNull: true, field: "end_reason" },
    durationMinutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: "duration_minutes" },
    whiteRemainingMs: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "white_remaining_ms" },
    blackRemainingMs: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "black_remaining_ms" },
    turnStartedAt: { type: DataTypes.DATE(3), allowNull: true, field: "turn_started_at" },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
    updatedAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
  }, { underscored: true, tableName: "games", version: "version" });
};
