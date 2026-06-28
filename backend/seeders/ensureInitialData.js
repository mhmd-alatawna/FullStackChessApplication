async function insertInitialData(sequelize, models) {
  await sequelize.transaction(async (transaction) => {
    await models.Player.bulkCreate([
      { id: "1", type: "admin", firstName: "Admin", lastName: "User", email: "admin@chessgrove.local", theme: "dark", elo: 1200 },
      { id: "2", type: "normal_user", firstName: "Manager", lastName: "User", email: "manager@chessgrove.local", theme: "dark", elo: 1200 },
      { id: "3", type: "normal_user", firstName: "Regular", lastName: "User", email: "player@chessgrove.local", theme: "dark", elo: 1200 },
      { id: "agent-random", type: "agent", firstName: "Random", lastName: "Bot", elo: 1200 },
      { id: "agent-heuristic", type: "agent", firstName: "Heuristic", lastName: "Bot", elo: 1450 },
      { id: "agent-monte-carlo", type: "agent", firstName: "Monte Carlo", lastName: "Bot", elo: 1600 },
      { id: "agent-strong-search", type: "agent", firstName: "Strong Search", lastName: "Bot", elo: 2000 },
      { id: "agent-uci", type: "agent", firstName: "Local UCI", lastName: "Engine", elo: 2400 },
      { id: "agent-remote", type: "agent", firstName: "Remote", lastName: "Engine", elo: 2400 },
    ], { transaction });
    await models.AdminUser.create({ playerId: "1", password: "admin123" }, { transaction });
    await models.NormalUser.bulkCreate([
      { playerId: "2", password: "manager123", role: "manager" },
      { playerId: "3", password: "player123", role: "user" },
    ], { transaction });
    await models.Agent.bulkCreate([
      { id: "random", playerId: "agent-random", strategy: "random", difficulty: "beginner", config: null, enabled: true },
      { id: "heuristic", playerId: "agent-heuristic", strategy: "heuristic", difficulty: "intermediate", config: null, enabled: true },
      { id: "monte-carlo", playerId: "agent-monte-carlo", strategy: "monte-carlo", difficulty: "advanced", config: { rolloutDepth: 14, exploration: 1.25 }, enabled: true },
      { id: "strong-search", playerId: "agent-strong-search", strategy: "strong-search", difficulty: "expert", config: null, enabled: true },
      { id: "uci", playerId: "agent-uci", strategy: "uci", difficulty: "engine", config: null, enabled: true },
      { id: "remote", playerId: "agent-remote", strategy: "remote", difficulty: "engine", config: null, enabled: true },
    ], { transaction });
  });
}

async function addMissingDefaultAgents(sequelize, models) {
  const agents = [
    { id: "heuristic", playerId: "agent-heuristic", firstName: "Heuristic", lastName: "Bot", strategy: "heuristic", difficulty: "intermediate", elo: 1450 },
    { id: "strong-search", playerId: "agent-strong-search", firstName: "Strong Search", lastName: "Bot", strategy: "strong-search", difficulty: "expert", elo: 2000 },
    { id: "uci", playerId: "agent-uci", firstName: "Local UCI", lastName: "Engine", strategy: "uci", difficulty: "engine", elo: 2400 },
    { id: "remote", playerId: "agent-remote", firstName: "Remote", lastName: "Engine", strategy: "remote", difficulty: "engine", elo: 2400 },
  ];

  await sequelize.transaction(async (transaction) => {
    for (const agent of agents) {
      await models.Player.findOrCreate({
        where: { id: agent.playerId },
        defaults: { type: "agent", firstName: agent.firstName, lastName: agent.lastName, elo: agent.elo },
        transaction,
      });
      await models.Agent.findOrCreate({
        where: { id: agent.id },
        defaults: { playerId: agent.playerId, strategy: agent.strategy, difficulty: agent.difficulty, config: null, enabled: true },
        transaction,
      });
    }
  });
}

async function addDefaultUserSettings(sequelize, models) {
  const defaults = [
    { id: "1", email: "admin@chessgrove.local", password: "admin123", previousPassword: "admin", admin: true },
    { id: "2", email: "manager@chessgrove.local", password: "manager123", previousPassword: "manager", admin: false },
    { id: "3", email: "player@chessgrove.local", password: "player123", previousPassword: "user", admin: false },
  ];

  await sequelize.transaction(async (transaction) => {
    for (const account of defaults) {
      const player = await models.Player.findByPk(account.id, { transaction });
      if (!player) continue;
      if (!player.email) await player.update({ email: account.email, theme: "dark" }, { transaction });

      const model = account.admin ? models.AdminUser : models.NormalUser;
      const subtype = await model.findByPk(account.id, { transaction });
      if (subtype?.password === account.previousPassword) {
        await subtype.update({ password: account.password }, { transaction });
      }
    }
  });
}

async function ensureInitialData(sequelize, models) {
  if (await models.Player.count() === 0) {
    await insertInitialData(sequelize, models);
    return;
  }

  await addMissingDefaultAgents(sequelize, models);
  await addDefaultUserSettings(sequelize, models);
}

module.exports = ensureInitialData;
