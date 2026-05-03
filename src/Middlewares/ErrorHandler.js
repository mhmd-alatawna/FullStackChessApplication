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
    err.statusCode = err.statusCode || 500;
    err.errorCode = err.errorCode || "INTERNAL_ERROR";

    res.status(err.statusCode).json({
        success: false,
        data: null,
        error: {
            code: err.errorCode,
            message: err.message,
            details: err.details || {}
        }
    });
};

module.exports = {
    AppError,
    errorHandler
};
