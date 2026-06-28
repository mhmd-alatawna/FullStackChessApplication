const { DataTypes } = require("sequelize");

module.exports = function defineGameParticipant(sequelize) {
  return sequelize.define("GameParticipant", {
    gameId: { type: DataTypes.STRING(64), primaryKey: true, field: "game_id" },
    color: { type: DataTypes.ENUM("white", "black"), primaryKey: true },
    playerId: { type: DataTypes.STRING(64), allowNull: false, field: "player_id" },
  }, {
    underscored: true,
    tableName: "game_participants",
    timestamps: false,
    indexes: [
      { name: "game_participants_game_player_unique", unique: true, fields: ["game_id", "player_id"] },
      { name: "game_participants_player_index", fields: ["player_id"] },
    ],
  });
};
