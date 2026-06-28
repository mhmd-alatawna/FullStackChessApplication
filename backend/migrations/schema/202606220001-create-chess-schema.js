const { DataTypes, literal } = require("sequelize");
const {
  PLAYER_TYPES,
  GAME_STATES,
  GAME_END_REASONS,
} = require("../../models/constants");

const timestamp = () => ({
  type: DataTypes.DATE(3),
  allowNull: false,
  defaultValue: literal("CURRENT_TIMESTAMP(3)"),
});

function normalizeTableName(table) {
  if (typeof table === "string") return table;
  return table.tableName || table.table_name || Object.values(table)[0];
}

async function createTableIfMissing(queryInterface, tableName, attributes) {
  const tables = (await queryInterface.showAllTables()).map(normalizeTableName);
  if (tables.includes(tableName)) return false;
  await queryInterface.createTable(tableName, attributes);
  return true;
}

module.exports = {
  async up(queryInterface) {
    await createTableIfMissing(queryInterface, "players", {
      id: { type: DataTypes.STRING(64), primaryKey: true },
      type: { type: DataTypes.ENUM(...Object.values(PLAYER_TYPES)), allowNull: false },
      first_name: { type: DataTypes.STRING(100), allowNull: false },
      last_name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: true, unique: true },
      theme: { type: DataTypes.ENUM("dark", "light"), allowNull: false, defaultValue: "dark" },
      wins: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      losses: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      draws: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      elo: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1200 },
      created_at: timestamp(),
      updated_at: timestamp(),
    });

    await createTableIfMissing(queryInterface, "normal_users", {
      player_id: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        references: { model: "players", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      password: { type: DataTypes.STRING(255), allowNull: false },
      role: { type: DataTypes.ENUM("user", "manager"), allowNull: false, defaultValue: "user" },
    });

    await createTableIfMissing(queryInterface, "admin_users", {
      player_id: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        references: { model: "players", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      password: { type: DataTypes.STRING(255), allowNull: false },
    });

    await createTableIfMissing(queryInterface, "agents", {
      id: { type: DataTypes.STRING(64), primaryKey: true },
      player_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        references: { model: "players", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      strategy: { type: DataTypes.STRING(64), allowNull: false },
      difficulty: { type: DataTypes.STRING(32), allowNull: false },
      config: { type: DataTypes.JSON, allowNull: true },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: timestamp(),
      updated_at: timestamp(),
    });

    await createTableIfMissing(queryInterface, "games", {
      id: { type: DataTypes.STRING(64), primaryKey: true },
      state: { type: DataTypes.ENUM(...GAME_STATES), allowNull: false },
      end_reason: { type: DataTypes.ENUM(...GAME_END_REASONS), allowNull: true },
      duration_minutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      white_remaining_ms: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      black_remaining_ms: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      turn_started_at: { type: DataTypes.DATE(3), allowNull: true },
      version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_at: timestamp(),
      updated_at: timestamp(),
    });

    const createdGameMoves = await createTableIfMissing(queryInterface, "game_moves", {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      game_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        references: { model: "games", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ply: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      uci: { type: DataTypes.STRING(5), allowNull: false },
      san: { type: DataTypes.STRING(32), allowNull: false },
      created_at: timestamp(),
    });
    if (createdGameMoves) {
      await queryInterface.addIndex("game_moves", ["game_id", "ply"], {
        name: "game_moves_game_ply_unique",
        unique: true,
      });
    }

    const createdParticipants = await createTableIfMissing(queryInterface, "game_participants", {
      game_id: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        references: { model: "games", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      color: { type: DataTypes.ENUM("white", "black"), primaryKey: true },
      player_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        references: { model: "players", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
    });
    if (createdParticipants) {
      await queryInterface.addIndex("game_participants", ["game_id", "player_id"], {
        name: "game_participants_game_player_unique",
        unique: true,
      });
      await queryInterface.addIndex("game_participants", ["player_id"], {
        name: "game_participants_player_index",
      });
    }

    const createdSessions = await createTableIfMissing(queryInterface, "sessions", {
      token: { type: DataTypes.STRING(255), primaryKey: true },
      player_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        references: { model: "players", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      expires_at: { type: DataTypes.DATE(3), allowNull: true },
      created_at: timestamp(),
    });
    if (createdSessions) {
      await queryInterface.addIndex("sessions", ["player_id"], {
        name: "sessions_player_index",
      });
    }

    const createdTickets = await createTableIfMissing(queryInterface, "matchmaking_tickets", {
      id: { type: DataTypes.STRING(64), primaryKey: true },
      player_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        references: { model: "players", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      duration_minutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      created_at: timestamp(),
    });
    if (createdTickets) {
      await queryInterface.addIndex("matchmaking_tickets", ["duration_minutes", "created_at"], {
        name: "matchmaking_duration_created_index",
      });
    }
  },

  async down(queryInterface) {
    const tables = [
      "matchmaking_tickets",
      "sessions",
      "game_participants",
      "game_moves",
      "games",
      "agents",
      "admin_users",
      "normal_users",
      "players",
    ];

    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
