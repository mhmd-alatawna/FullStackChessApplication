const winston = require('winston');

// Define custom formatting
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
});

const logger = winston.createLogger({
    level: 'info', // Minimum level to log
    format: winston.format.combine(
        // Adds the date and time of the request
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true })
    ),
    transports: [
        // 1. Console Output (Colorized for development)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // 2. File Output (Permanent record for production/debugging)
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: logFormat
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: logFormat
        })
    ]
});

const requestLogger = (req, res, next) => {
    // Capture the start time to calculate duration
    const start = Date.now();

    // Listen for the response to finish
    res.on('finish', () => {
        const duration = Date.now() - start;

        // Format the log message with your requirements
        const message = `${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms`;

        // Categorize log levels based on the HTTP status code
        if (res.statusCode >= 500) {
            logger.error(message); // Server errors
        } else if (res.statusCode >= 400) {
            logger.warn(message);  // Client errors (e.g., 404 Not Found, 401 Unauthorized)
        } else {
            logger.info(message);  // Successful requests
        }
    });

    // Pass control to the next middleware or route handler
    next();
};

module.exports = requestLogger;