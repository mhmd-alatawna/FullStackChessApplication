// ⚠️ ADDED FOR ASSIGNMENT 3
const express = require("express");
const { AppError } = require("../Middlewares/ErrorHandler");
const authorize = require("../Middlewares/Auth");

module.exports = (controllersManager) => {
  const router = express.Router();
  const usersController = controllersManager.getUsersController();

  // GET /settings — returns logged-in user's data from x-user-id header
  router.get("/", authorize(["admin", "manager", "user"]), async (req, res, next) => { // ⚠️ ADDED FOR ASSIGNMENT 3
    try {
      const userId = req.headers["x-user-id"];
      if (!userId || isNaN(Number(userId))) {
        throw new AppError("x-user-id header is required", 400, "VALIDATION_ERROR", { header: "x-user-id" });
      }
      const user = await usersController.getUserById(userId);
      res.status(200).json({ success: true, data: user, error: null });
    } catch (err) {
      next(err);
    }
  });

  // PUT /settings — updates logged-in user's firstName, lastName, and optionally password
  router.put("/", authorize(["admin", "manager", "user"]), async (req, res, next) => { // ⚠️ ADDED FOR ASSIGNMENT 3
    try {
      const userId = req.headers["x-user-id"];
      if (!userId || isNaN(Number(userId))) {
        throw new AppError("x-user-id header is required", 400, "VALIDATION_ERROR", { header: "x-user-id" });
      }
      const { firstName, lastName, password } = req.body || {}; // ⚠️ ADDED FOR ASSIGNMENT 3: removed userRole, added password
      if (!firstName || !lastName) {
        throw new AppError("firstName and lastName are required", 400, "VALIDATION_ERROR", { required: ["firstName", "lastName"] });
      }
      if (password !== undefined && password !== null && password !== "" && password.length < 6) { // ⚠️ ADDED FOR ASSIGNMENT 3
        throw new AppError("Password must be at least 6 characters", 400, "VALIDATION_ERROR", { field: "password" });
      }
      await usersController.updateUserSettings(userId, firstName, lastName, password || null); // ⚠️ ADDED FOR ASSIGNMENT 3
      const updated = await usersController.getUserById(userId);
      res.status(200).json({ success: true, data: updated, error: null });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
