const { DataTypes } = require("sequelize");

module.exports = function defineMatchmakingTicket(sequelize) {
  return sequelize.define("MatchmakingTicket", {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    playerId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: "player_id" },
    durationMinutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "duration_minutes" },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  }, {
    underscored: true,
    tableName: "matchmaking_tickets",
    updatedAt: false,
    indexes: [{ name: "matchmaking_duration_created_index", fields: ["duration_minutes", "created_at"] }],
  });
};
