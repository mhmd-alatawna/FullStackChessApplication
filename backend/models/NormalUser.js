const { DataTypes } = require("sequelize");

module.exports = function defineNormalUser(sequelize) {
  return sequelize.define("NormalUser", {
    playerId: { type: DataTypes.STRING(64), primaryKey: true, field: "player_id" },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM("user", "manager"), allowNull: false, defaultValue: "user" },
  }, { underscored: true, tableName: "normal_users", timestamps: false });
};
