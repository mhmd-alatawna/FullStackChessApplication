// ⚠️ ADDED FOR ASSIGNMENT 3
const express = require("express");
const { AppError } = require("../Middlewares/ErrorHandler");

module.exports = (controllersManager) => {
  const router = express.Router();
  const usersController = controllersManager.getUsersController();

  // POST /auth/login — validate user exists, return user object
  router.post("/login", async (req, res, next) => { // ⚠️ ADDED FOR ASSIGNMENT 3
    try {
      const { userId, userRole } = req.body || {};
      if (!userId || isNaN(Number(userId))) {
        throw new AppError("A valid numeric userId is required", 400, "VALIDATION_ERROR", { field: "userId" });
      }
      const allowedRoles = ["admin", "manager", "user"];
      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new AppError("userRole must be one of: admin, manager, user", 400, "VALIDATION_ERROR", { field: "userRole" });
      }
      const user = await usersController.getUserById(userId);
      res.status(200).json({ success: true, data: user, error: null });
    } catch (err) {
      next(err);
    }
  });

  // POST /auth/logout — stateless, always succeeds
  router.post("/logout", (req, res) => { // ⚠️ ADDED FOR ASSIGNMENT 3
    res.status(200).json({ success: true, data: { message: "Logged out successfully" }, error: null });
  });

  return router;
};
