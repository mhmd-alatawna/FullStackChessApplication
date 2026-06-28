const express = require("express");
const { OPERATIONS } = require("../../security/rbac");
const { authorize } = require("../middleware/accessControl");
const { createSuccessResponse } = require("../response");

function createAgentsRoutes(automatedPlayersUseCases) {
  const router = express.Router();

  router.get("/", authorize(OPERATIONS.AGENT_READ), async (req, res) => {
    const agents = await automatedPlayersUseCases.getAllAutomatedPlayers();
    res.status(200).json(createSuccessResponse(agents));
  });

  return router;
}

module.exports = createAgentsRoutes;
