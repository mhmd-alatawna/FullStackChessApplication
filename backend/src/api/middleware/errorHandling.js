const AppError = require("../../AppError");
const { createErrorResponse } = require("../response");

function notFound(req, res, next) {
  next(new AppError(
    `Route ${req.method} ${req.originalUrl} was not found`,
    404,
    "ROUTE_NOT_FOUND",
  ));
}

function createErrorHandler(logger) {
  return function errorHandler(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    let handledError = error;
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
      handledError = new AppError("The request body contains invalid JSON", 400, "INVALID_JSON");
    }

    const isExpectedError = handledError instanceof AppError;
    const statusCode = isExpectedError ? handledError.statusCode : 500;

    if (!isExpectedError) {
      logger.error(`Unhandled error requestId=${req.requestId}: ${error.stack || error.message}`);
    }

    res.status(statusCode).json(createErrorResponse(handledError));
  };
}

module.exports = { notFound, createErrorHandler };
