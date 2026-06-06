// ⚠️ ADDED FOR ASSIGNMENT 3
const express = require("express");
const { AppError } = require("../Middlewares/ErrorHandler");

module.exports = (controllersManager) => {
  const router = express.Router();
  const usersController = controllersManager.getUsersController();

  // POST /auth/login — accepts {email, password}, finds user by email, validates password
  router.post("/login", async (req, res, next) => { // ⚠️ ADDED FOR ASSIGNMENT 3
    try {
      const { email, password } = req.body || {};
      if (!email || typeof email !== "string" || !email.includes("@")) {
        throw new AppError("A valid email address is required", 400, "VALIDATION_ERROR", { field: "email" });
      }
      if (!password || password.length < 6) {
        throw new AppError("Password must be at least 6 characters", 400, "VALIDATION_ERROR", { field: "password" });
      }
      const user = await usersController.getUserByEmail(email.trim().toLowerCase()); // ⚠️ ADDED FOR ASSIGNMENT 3
      if (!user || user.password !== password) {
        throw new AppError("Invalid email or password", 401, "UNAUTHORIZED", {});
      }
      // Return user without exposing the password field
      const { password: _pw, ...safeUser } = user; // ⚠️ ADDED FOR ASSIGNMENT 3
      res.status(200).json({ success: true, data: safeUser, error: null });
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
