const createApplication = require("./createApplication");

let application = null;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown || !application) {
    return;
  }
  shuttingDown = true;
  application.logger.info(`Received ${signal}; shutting down`);
  application.stopBackgroundTasks();
  await new Promise((resolve) => application.io.close(resolve));
  await application.closeDataAccess();
  application.logger.info("Chess Grove backend stopped");
}

process.once("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
});
process.once("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
});

async function start() {
  application = createApplication();
  await application.ready;
  application.httpServer.listen(application.config.application_port, () => {
    application.logger.info(`Chess Grove backend listening on http://localhost:${application.config.application_port}`);
  });
}

start().catch(async (error) => {
  console.error(`Chess Grove backend failed to start: ${error.stack || error.message}`);
  if (application) {
    application.stopBackgroundTasks();
    await application.closeDataAccess().catch(() => {});
  }
  process.exitCode = 1;
});
