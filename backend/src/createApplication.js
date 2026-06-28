const express = require("express");
const cors = require("cors");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const config = require("./config");
const SequelizeDataAccess = require("./infrastructure/sequelize/SequelizeDataAccess");
const AuthUseCases = require("./useCases/AuthUseCases");
const UsersUseCases = require("./useCases/UsersUseCases");
const GamesUseCases = require("./useCases/GamesUseCases");
const MatchmakingUseCases = require("./useCases/MatchmakingUseCases");
const AutomatedPlayersUseCases = require("./useCases/AutomatedPlayersUseCases");
const createRequestLogger = require("./api/middleware/requestLogger");
const createAuthenticationMiddleware = require("./api/middleware/authentication");
const { notFound, createErrorHandler } = require("./api/middleware/errorHandling");
const createAuthRoutes = require("./api/routes/authRoutes");
const createUsersRoutes = require("./api/routes/usersRoutes");
const createGamesRoutes = require("./api/routes/gamesRoutes");
const createAgentsRoutes = require("./api/routes/agentsRoutes");
const createSettingsRoutes = require("./api/routes/settingsRoutes");
const GameTimeoutScheduler = require("./websocket/GameTimeoutScheduler");
const WebSocketGateway = require("./websocket/WebSocketGateway");
const { assertDataAccess } = require("./infrastructure/contracts/DataAccessContract");
const { createSuccessResponse } = require("./api/response");
const winston = require("winston");

function createLogger(silent = false) {
  return winston.createLogger({
    level: "info",
    silent,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((entry) => {
          return `${entry.timestamp} ${entry.level}: ${entry.message}`;
        }),
    ),
    transports: [new winston.transports.Console()],
  });
}
function createApplication() {
  const applicationConfig = config;
  const dataAccess = new SequelizeDataAccess(applicationConfig);
  assertDataAccess(dataAccess);
  const logger = createLogger(false);
  const corsOrigins = String(applicationConfig.cors_origin)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOptions = { origin: corsOrigins };

  const gamesUseCases = new GamesUseCases(dataAccess);
  const useCases = {
    auth: new AuthUseCases(dataAccess),
    users: new UsersUseCases(dataAccess),
    games: gamesUseCases,
    matchmaking: new MatchmakingUseCases(dataAccess, applicationConfig),
    automatedPlayers: new AutomatedPlayersUseCases(dataAccess, gamesUseCases, applicationConfig),
  };

  const app = express();

  app.use(cors(corsOptions));
  app.use(createRequestLogger(logger));
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: corsOptions,
  });

  const timeoutScheduler = new GameTimeoutScheduler(
    useCases.games,
    (gameData) => {
      useCases.automatedPlayers.finishGame(gameData.id);
      io.to(`game:${gameData.id}`).emit(
        "game:finished",
        createSuccessResponse({ game: gameData, move: null }),
      );
    },
    logger,
  );
  const webSocketGateway = new WebSocketGateway(io, useCases, timeoutScheduler, logger);
  webSocketGateway.register();

  const authenticate = createAuthenticationMiddleware(useCases.auth);

  app.get("/api/health", (req, res) => {
    res.status(200).json(createSuccessResponse({ status: "ok" }));
  });

  app.use("/api/auth", createAuthRoutes(
    useCases.auth,
    useCases.users,
    authenticate,
    async (token, userId) => {
      webSocketGateway.disconnectSession(token);
      await useCases.matchmaking.cancelIfWaiting(userId);
    },
  ));
  app.use("/api/users", authenticate, createUsersRoutes(
    useCases.users,
    (userId) => webSocketGateway.disconnectUser(userId),
  ));
  app.use("/api/games", authenticate, createGamesRoutes(
    useCases.games,
    (gameId) => {
      timeoutScheduler.cancel(gameId);
      useCases.automatedPlayers.finishGame(gameId);
    },
  ));
  app.use("/api/agents", authenticate, createAgentsRoutes(useCases.automatedPlayers));
  app.use("/api/settings", authenticate, createSettingsRoutes(useCases.users));
  app.use(notFound);
  app.use(createErrorHandler(logger));

  const ready = Promise.resolve(dataAccess.initialize()).then(async () => {
    await timeoutScheduler.restore();
    await webSocketGateway.restore();
  });

  return {
    app,
    httpServer,
    io,
    logger,
    config: applicationConfig,
    ready,
    stopBackgroundTasks() {
      timeoutScheduler.stop();
      webSocketGateway.stop();
    },
    async closeDataAccess() {
      await dataAccess.close();
    },
  };
}

module.exports = createApplication;
