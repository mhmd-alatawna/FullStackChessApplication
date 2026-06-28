const { DataTypes } = require("sequelize");

module.exports = function defineSession(sequelize) {
  return sequelize.define("Session", {
    token: { type: DataTypes.STRING(255), primaryKey: true },
    playerId: { type: DataTypes.STRING(64), allowNull: false, field: "player_id" },
    expiresAt: { type: DataTypes.DATE(3), allowNull: true, field: "expires_at" },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  }, {
    underscored: true,
    tableName: "sessions",
    updatedAt: false,
    indexes: [{ name: "sessions_player_index", fields: ["player_id"] }],
  });
};
