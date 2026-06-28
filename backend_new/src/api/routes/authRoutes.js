const express = require("express");
const AppError = require("../../AppError");
const { createSuccessResponse } = require("../response");

function createAuthRoutes(authUseCases, usersUseCases, authenticate, onLogout) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const body = req.body || {};
    const hasUserId = body.userId !== undefined && body.userId !== null && body.userId !== "";
    const hasName = Boolean(body.firstName && body.lastName);
    const hasEmail = Boolean(body.email);
    if ((!hasUserId && !hasName && !hasEmail) || !body.password) {
      throw new AppError("An email, name, or userId and password are required", 400, "VALIDATION_ERROR", {
        required: ["password", "email, userId, or firstName and lastName"],
      });
    }

    const result = await authUseCases.login({
      userId: hasUserId ? String(body.userId) : undefined,
      email: hasEmail ? String(body.email).trim().toLowerCase() : undefined,
      firstName: hasName ? String(body.firstName).trim() : undefined,
      lastName: hasName ? String(body.lastName).trim() : undefined,
      password: body.password,
    });
    res.status(200).json(createSuccessResponse(result));
  });

  router.post("/signup", async (req, res) => {
    const body = req.body || {};
    if (!body.firstName || !body.lastName || !body.password) {
      throw new AppError(
        "firstName, lastName and password are required",
        400,
        "VALIDATION_ERROR",
        { required: ["firstName", "lastName", "password"] },
      );
    }

    const user = await usersUseCases.createUser({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: body.password,
    });
    const result = await authUseCases.login({
      userId: user.id,
      password: body.password,
    });
    res.status(201).json(createSuccessResponse(result));
  });

  router.use(authenticate);

  router.post("/logout", async (req, res) => {
    await authUseCases.logout(req.authToken);
    await onLogout(req.authToken, req.user.id);
    res.status(200).json(createSuccessResponse({ message: "Logged out successfully" }));
  });

  return router;
}

module.exports = createAuthRoutes;
