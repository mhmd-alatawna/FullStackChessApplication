class AppError extends Error {
    constructor(message, statusCode, errorCode = "INTERNAL_ERROR", details = {}) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    const errorCode = err.errorCode || (statusCode >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");

    res.status(statusCode).json({
        success: false,
        data: null,
        error: {
            code: errorCode,
            message: err.message || "An unexpected error occurred",
            details: err.details || {}
        }
    });
};

module.exports = {
    AppError,
    errorHandler
};
