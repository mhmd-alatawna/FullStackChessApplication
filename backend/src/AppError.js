class AppError extends Error {
  constructor(message, statusCode, errorCode = "INTERNAL_ERROR", details = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

module.exports = AppError;
