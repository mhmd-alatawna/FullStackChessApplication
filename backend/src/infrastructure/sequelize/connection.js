const { Sequelize } = require("sequelize");

function connectionOptions(config) {
  return {
    dialect: config.database_type,
    host: config.database_location,
    port: config.database_port,
    logging: false,
    define: { underscored: true, freezeTableName: true },
  };
}

function createSequelize(config, databaseName = config.database_name) {
  return new Sequelize(
    databaseName,
    config.database_user,
    config.database_password,
    connectionOptions(config),
  );
}

async function createDatabaseIfMissing(config) {
  const serverConnection = createSequelize(config, "");
  const databaseName = serverConnection.getQueryInterface().queryGenerator.quoteIdentifier(
    config.database_name,
  );

  try {
    await serverConnection.query(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
  } finally {
    await serverConnection.close();
  }
}

async function authenticateOrCreate(sequelize, config) {
  try {
    await sequelize.authenticate();
  } catch (error) {
    if (error.original?.code !== "ER_BAD_DB_ERROR") throw error;
    await createDatabaseIfMissing(config);
    await sequelize.authenticate();
  }
}

module.exports = {
  authenticateOrCreate,
  createDatabaseIfMissing,
  createSequelize,
};
