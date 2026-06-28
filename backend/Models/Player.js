const { DataTypes } = require("sequelize");
const { PLAYER_TYPES } = require("./constants");

module.exports = function definePlayer(sequelize) {
  return sequelize.define("Player", {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    type: { type: DataTypes.ENUM(...Object.values(PLAYER_TYPES)), allowNull: false },
    firstName: { type: DataTypes.STRING(100), allowNull: false, field: "first_name" },
    lastName: { type: DataTypes.STRING(100), allowNull: false, field: "last_name" },
    email: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    theme: { type: DataTypes.ENUM("dark", "light"), allowNull: false, defaultValue: "dark" },
    wins: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    losses: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    draws: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    elo: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1200 },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
    updatedAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
  }, { underscored: true, tableName: "players" });
};
