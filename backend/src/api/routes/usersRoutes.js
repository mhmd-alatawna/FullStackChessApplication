const express = require("express");
const AppError = require("../../AppError");
const {
  OPERATIONS,
  assertCanAssignRole,
} = require("../../security/rbac");
const { authorize, authorizeUserAccess } = require("../middleware/accessControl");
const { createSuccessResponse } = require("../response");

function validateProfileBody(body) {
  const hasFirstName = body.firstName !== undefined;
  const hasLastName = body.lastName !== undefined;
  const hasPassword = body.password !== undefined;

  if (!hasFirstName && !hasLastName && !hasPassword) {
    throw new AppError(
      "At least one profile field is required",
      400,
      "VALIDATION_ERROR",
      { allowed: ["firstName", "lastName", "password"] },
    );
  }
}

function createUsersRoutes(usersUseCases, onUserDeleted) {
  const router = express.Router();

  router.get("/", authorize(OPERATIONS.USER_READ_ANY), async (req, res) => {
    const users = await usersUseCases.getAllUsers();
    res.status(200).json(createSuccessResponse(users));
  });

  router.post("/", authorize(OPERATIONS.USER_CREATE), async (req, res) => {
    const body = req.body || {};
    if (!body.firstName || !body.lastName || !body.password || !body.role) {
      throw new AppError(
        "firstName, lastName, password and role are required",
        400,
        "VALIDATION_ERROR",
        { required: ["firstName", "lastName", "password", "role"] },
      );
    }

    assertCanAssignRole(req.user, body.role);
    const user = await usersUseCases.createUser(body);
    res.status(201).json(createSuccessResponse(user));
  });

  router.get("/me", authorize(OPERATIONS.USER_READ_SELF), async (req, res) => {
    const user = await usersUseCases.getUser(req.user.id);
    res.status(200).json(createSuccessResponse(user));
  });

  router.put("/me", authorize(OPERATIONS.USER_UPDATE_SELF), async (req, res) => {
    const body = req.body || {};
    validateProfileBody(body);

    const user = await usersUseCases.updateProfile(req.user.id, body);
    res.status(200).json(createSuccessResponse(user));
  });

  router.put("/:userId/role", authorize(OPERATIONS.USER_CHANGE_ROLE), async (req, res) => {
    if (!req.body || !req.body.role) {
      throw new AppError("role is required", 400, "VALIDATION_ERROR", { required: ["role"] });
    }

    const user = await usersUseCases.changeRole(
      String(req.params.userId),
      req.body.role,
    );
    res.status(200).json(createSuccessResponse(user));
  });

  router.get(
    "/:userId",
    authorizeUserAccess(OPERATIONS.USER_READ_SELF, OPERATIONS.USER_READ_ANY),
    async (req, res) => {
      const user = await usersUseCases.getUser(String(req.params.userId));
      res.status(200).json(createSuccessResponse(user));
    },
  );

  router.put(
    "/:userId",
    authorizeUserAccess(OPERATIONS.USER_UPDATE_SELF, OPERATIONS.USER_UPDATE_ANY),
    async (req, res) => {
      const body = req.body || {};
      validateProfileBody(body);

      const user = await usersUseCases.updateProfile(String(req.params.userId), body);
      res.status(200).json(createSuccessResponse(user));
    },
  );

  router.delete("/:userId", authorize(OPERATIONS.USER_DELETE), async (req, res) => {
    const deletedUser = await usersUseCases.deleteUser(String(req.params.userId));
    onUserDeleted(String(req.params.userId));
    res.status(200).json(createSuccessResponse(deletedUser));
  });

  return router;
}

module.exports = createUsersRoutes;
