const { DataTypes } = require("sequelize");

const PLAYER_TYPES = Object.freeze({ NORMAL_USER: "normal_user", ADMIN: "admin", AGENT: "agent" });
const GAME_STATES = ["waiting", "white_turn", "black_turn", "white_won", "black_won", "draw", "cancelled"];
const GAME_END_REASONS = ["checkmate", "stalemate", "repetition", "insufficient_material", "fifty_move_rule", "resignation", "timeout", "cancelled", "other_draw"];

function defineModels(sequelize) {
  const Player = sequelize.define("Player", {
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

  const NormalUser = sequelize.define("NormalUser", {
    playerId: { type: DataTypes.STRING(64), primaryKey: true, field: "player_id" },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM("user", "manager"), allowNull: false, defaultValue: "user" },
  }, { underscored: true, tableName: "normal_users", timestamps: false });

  const AdminUser = sequelize.define("AdminUser", {
    playerId: { type: DataTypes.STRING(64), primaryKey: true, field: "player_id" },
    password: { type: DataTypes.STRING(255), allowNull: false },
  }, { underscored: true, tableName: "admin_users", timestamps: false });

  const Agent = sequelize.define("Agent", {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    playerId: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: "player_id" },
    strategy: { type: DataTypes.STRING(64), allowNull: false },
    difficulty: { type: DataTypes.STRING(32), allowNull: false },
    config: { type: DataTypes.JSON, allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
    updatedAt: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW, field: "updated_at" },
  }, { underscored: true, tableName: "agents" });

  const GameModel = sequelize.define("Game", {
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

  const GameMove = sequelize.define("GameMove", {
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

  const GameParticipant = sequelize.define("GameParticipant", {
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

  const Session = sequelize.define("Session", {
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

  const MatchmakingTicket = sequelize.define("MatchmakingTicket", {
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

  Player.hasOne(NormalUser, { foreignKey: "playerId", as: "normalUser", onDelete: "CASCADE" });
  NormalUser.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });
  Player.hasOne(AdminUser, { foreignKey: "playerId", as: "adminUser", onDelete: "CASCADE" });
  AdminUser.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });
  Player.hasOne(Agent, { foreignKey: "playerId", as: "agent", onDelete: "CASCADE" });
  Agent.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });

  GameModel.hasMany(GameMove, { foreignKey: "gameId", as: "moves", onDelete: "CASCADE" });
  GameMove.belongsTo(GameModel, { foreignKey: "gameId", as: "game", onDelete: "CASCADE" });
  GameModel.hasMany(GameParticipant, { foreignKey: "gameId", as: "participants", onDelete: "CASCADE" });
  GameModel.hasMany(GameParticipant, { foreignKey: "gameId", as: "participantFilter", constraints: false });
  GameParticipant.belongsTo(GameModel, { foreignKey: "gameId", as: "game", onDelete: "CASCADE" });
  Player.hasMany(GameParticipant, { foreignKey: "playerId", as: "gameParticipants", onDelete: "RESTRICT" });
  GameParticipant.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "RESTRICT" });

  Player.hasMany(Session, { foreignKey: "playerId", as: "sessions", onDelete: "CASCADE" });
  Session.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });
  Player.hasOne(MatchmakingTicket, { foreignKey: "playerId", as: "matchingTicket", onDelete: "CASCADE" });
  MatchmakingTicket.belongsTo(Player, { foreignKey: "playerId", as: "player", onDelete: "CASCADE" });

  return { Player, NormalUser, AdminUser, Agent, Game: GameModel, GameMove, GameParticipant, Session, MatchmakingTicket };
}

module.exports = { defineModels, PLAYER_TYPES };
