const express = require("express");
const { OPERATIONS } = require("../../security/rbac");
const { authorize, authorizeGameAccess } = require("../middleware/accessControl");
const { createSuccessResponse } = require("../response");

function createGamesRoutes(gamesUseCases, onGameDeleted) {
  const router = express.Router();

  router.get("/", authorize(OPERATIONS.GAME_READ_ANY), async (req, res) => {
    const games = await gamesUseCases.getAllGames();
    res.status(200).json(createSuccessResponse(games));
  });

  router.get("/my", authorize(OPERATIONS.GAME_READ_SELF), async (req, res) => {
    const games = await gamesUseCases.getGamesForUser(req.user.id);
    res.status(200).json(createSuccessResponse(games));
  });

  router.get(
    "/:gameId/legal-moves",
    authorize(OPERATIONS.GAME_READ_SELF),
    async (req, res) => {
      const moves = await gamesUseCases.getLegalMoves(req.params.gameId, req.user.id);
      res.status(200).json(createSuccessResponse(moves));
    },
  );

  router.get("/:gameId", authorizeGameAccess(gamesUseCases), async (req, res) => {
    res.status(200).json(createSuccessResponse(req.gameData));
  });

  router.delete("/:gameId", authorize(OPERATIONS.GAME_DELETE), async (req, res) => {
    await gamesUseCases.deleteGame(req.params.gameId);
    onGameDeleted(req.params.gameId);
    res.status(200).json(createSuccessResponse({ gameId: String(req.params.gameId) }));
  });

  return router;
}

module.exports = createGamesRoutes;
