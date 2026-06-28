const { DataTypes } = require("sequelize");

module.exports = function defineGameMove(sequelize) {
  return sequelize.define("GameMove", {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    gameId: { type: DataTypes.STRING(64), allowNull: false, field: "game_id" },
    ply: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    uci: { type: DataTypes.STRING(5), allowNull: false },
    san: { type: DataTypes.STRING(32), allowNull: false },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
  }, {
    underscored: true,
    tableName: "game_moves",
    updatedAt: false,
    indexes: [{ name: "game_moves_game_ply_unique", unique: true, fields: ["game_id", "ply"] }],
  });
};
