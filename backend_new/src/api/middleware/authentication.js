const AppError = require("../../AppError");
const { getBearerToken } = require("../../security/securityHelpers");

function createAuthenticationMiddleware(authUseCases) {
  return async function authenticate(req, res, next) {
    try {
      const token = getBearerToken(req.headers.authorization);
      if (!token) {
        throw new AppError("A bearer authentication token is required", 401, "UNAUTHENTICATED");
      }

      req.user = await authUseCases.getAuthenticatedUser(token);
      req.authToken = token;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = createAuthenticationMiddleware;
