const express = require("express");
const AppError = require("../../AppError");
const { OPERATIONS } = require("../../security/rbac");
const { authorize } = require("../middleware/accessControl");
const { createSuccessResponse } = require("../response");

function createSettingsRoutes(usersUseCases) {
  const router = express.Router();

  router.get("/", authorize(OPERATIONS.USER_READ_SELF), async (req, res) => {
    const settings = await usersUseCases.getUser(req.user.id);
    res.status(200).json(createSuccessResponse(settings));
  });

  router.put("/", authorize(OPERATIONS.USER_UPDATE_SELF), async (req, res) => {
    const body = req.body || {};
    if (!body.firstName || !body.lastName || !body.email || !body.theme) {
      throw new AppError("First name, last name, email, and theme are required", 400, "VALIDATION_ERROR", {
        required: ["firstName", "lastName", "email", "theme"],
      });
    }
    const settings = await usersUseCases.updateProfile(req.user.id, {
      firstName: String(body.firstName).trim(),
      lastName: String(body.lastName).trim(),
      email: String(body.email).trim().toLowerCase(),
      theme: body.theme,
    });
    res.status(200).json(createSuccessResponse(settings));
  });

  return router;
}

module.exports = createSettingsRoutes;
