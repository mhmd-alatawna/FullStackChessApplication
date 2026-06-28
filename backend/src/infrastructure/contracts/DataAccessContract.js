const repositoryMethods = {
  users: ["findById", "findByEmail", "findByName", "findNamesByIds", "findAll", "create", "update", "delete"],
  games: ["findById", "findAll", "findByPlayerId", "create", "update", "delete"],
  sessions: ["create", "findUserId", "delete"],
  matchmaking: ["findByUserId", "takeWaiting", "create", "delete"],
  agents: ["findById", "findByUserId", "findAll"],
  ids: ["next"],
};

function assertDataAccess(dataAccess) {
  if (!dataAccess || typeof dataAccess !== "object") {
    throw new TypeError("A data-access adapter is required");
  }

  for (const [repositoryName, methods] of Object.entries(repositoryMethods)) {
    const repository = dataAccess[repositoryName];
    if (!repository) {
      throw new TypeError(`Data-access repository ${repositoryName} is required`);
    }
    for (const method of methods) {
      if (typeof repository[method] !== "function") {
        throw new TypeError(`Data-access method ${repositoryName}.${method} is required`);
      }
    }
  }

  for (const method of ["initialize", "close", "transaction"]) {
    if (typeof dataAccess[method] !== "function") {
      throw new TypeError(`Data-access method ${method} is required`);
    }
  }
}

module.exports = { assertDataAccess };
