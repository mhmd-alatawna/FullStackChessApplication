const { randomUUID } = require("node:crypto");

function createRequestLogger(logger) {
  return function requestLogger(req, res, next) {
    const startedAt = Date.now();
    req.requestId = randomUUID();
    res.setHeader("x-request-id", req.requestId);

    res.on("finish", () => {
      const duration = Date.now() - startedAt;
      let userId = "anonymous";
      if (req.user) {
        userId = req.user.id;
      }

      const message = [
        req.method,
        req.originalUrl,
        `status=${res.statusCode}`,
        `duration=${duration}ms`,
        `user=${userId}`,
        `requestId=${req.requestId}`,
      ].join(" ");

      if (res.statusCode >= 500) {
        logger.error(message);
      } else if (res.statusCode >= 400) {
        logger.warn(message);
      } else {
        logger.info(message);
      }
    });

    next();
  };
}

module.exports = createRequestLogger;
