const definePlayer = require("./Player");
const defineNormalUser = require("./NormalUser");
const defineAdminUser = require("./AdminUser");
const defineAgent = require("./Agent");
const defineGame = require("./Game");
const defineGameMove = require("./GameMove");
const defineGameParticipant = require("./GameParticipant");
const defineSession = require("./Session");
const defineMatchmakingTicket = require("./MatchmakingTicket");
const { PLAYER_TYPES } = require("./constants");

function defineModels(sequelize) {
  const Player = definePlayer(sequelize);
  const NormalUser = defineNormalUser(sequelize);
  const AdminUser = defineAdminUser(sequelize);
  const Agent = defineAgent(sequelize);
  const Game = defineGame(sequelize);
  const GameMove = defineGameMove(sequelize);
  const GameParticipant = defineGameParticipant(sequelize);
  const Session = defineSession(sequelize);
  const MatchmakingTicket = defineMatchmakingTicket(sequelize);

  Player.hasOne(NormalUser, { foreignKey: "playerId", as: "normalUser", onDelete: "CASCADE" });
  NormalUser.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });
  Player.hasOne(AdminUser, { foreignKey: "playerId", as: "adminUser", onDelete: "CASCADE" });
  AdminUser.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });
  Player.hasOne(Agent, { foreignKey: "playerId", as: "agent", onDelete: "CASCADE" });
  Agent.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });

  Game.hasMany(GameMove, { foreignKey: "gameId", as: "moves", onDelete: "CASCADE" });
  GameMove.belongsTo(Game, { foreignKey: "gameId", as: "game", onDelete: "CASCADE" });
  Game.hasMany(GameParticipant, { foreignKey: "gameId", as: "participants", onDelete: "CASCADE" });
  Game.hasMany(GameParticipant, { foreignKey: "gameId", as: "participantFilter", constraints: false });
  GameParticipant.belongsTo(Game, { foreignKey: "gameId", as: "game", onDelete: "CASCADE" });
  Player.hasMany(GameParticipant, { foreignKey: "playerId", as: "gameParticipants", onDelete: "RESTRICT" });
  GameParticipant.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "RESTRICT" });

  Player.hasMany(Session, { foreignKey: "playerId", as: "sessions", onDelete: "CASCADE" });
  Session.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });
  Player.hasOne(MatchmakingTicket, { foreignKey: "playerId", as: "matchingTicket", onDelete: "CASCADE" });
  MatchmakingTicket.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });

  return { Player, NormalUser, AdminUser, Agent, Game, GameMove, GameParticipant, Session, MatchmakingTicket };
}

module.exports = { defineModels, PLAYER_TYPES };
