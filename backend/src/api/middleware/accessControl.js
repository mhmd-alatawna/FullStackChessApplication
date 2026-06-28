const AppError = require("../../AppError");
const {
  assertPermission,
  canAccessUser,
  canAccessGame,
} = require("../../security/rbac");

function authorize(operation) {
  return function authorizeOperation(req, res, next) {
    try {
      assertPermission(req.user, operation);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function authorizeUserAccess(selfOperation, anyOperation) {
  return function authorizeUserResource(req, res, next) {
    if (!canAccessUser(req.user, req.params.userId, selfOperation, anyOperation)) {
      return next(new AppError(
        "You may only access your own user resource",
        403,
        "FORBIDDEN",
      ));
    }
    next();
  };
}

function authorizeGameAccess(gamesUseCases) {
  return async function authorizeGameAccess(req, res, next) {
    try {
      const gameData = await gamesUseCases.getGame(req.params.gameId);
      if (!canAccessGame(req.user, gameData)) {
        throw new AppError("You do not have permission to access this game", 403, "FORBIDDEN");
      }
      req.gameData = gameData;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { authorize, authorizeUserAccess, authorizeGameAccess };
