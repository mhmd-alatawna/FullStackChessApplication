const { DataTypes } = require("sequelize");

module.exports = function defineAdminUser(sequelize) {
  return sequelize.define("AdminUser", {
    playerId: { type: DataTypes.STRING(64), primaryKey: true, field: "player_id" },
    password: { type: DataTypes.STRING(255), allowNull: false },
  }, { underscored: true, tableName: "admin_users", timestamps: false });
};
