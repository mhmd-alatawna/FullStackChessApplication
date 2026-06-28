const AppError = require("../AppError");
const {
  createChessAgent,
  isAgentStrategyAvailable,
  isSupportedAgentStrategy,
} = require("../agents/createChessAgent");
const { createWorkerPool: createMonteCarloWorkerPool } = require("../agents/MonteCarloChessAgent");
const { createWorkerPool: createStrongSearchWorkerPool } = require("../agents/StrongSearchAgent");

class AutomatedPlayersUseCases {
  constructor(dataAccess, gamesUseCases, config) {
    this.config = config;
    this.agents = dataAccess.agents;
    this.gamesUseCases = gamesUseCases;
    this.gameAgents = new Map();
    this.thinkTimeMs = config.monte_carlo_think_time_ms;
    this.strongThinkTimeMs = config.strong_agent_think_time_ms;
    this.monteCarloWorkerPool = createMonteCarloWorkerPool(
      config.monte_carlo_max_threads,
      config.monte_carlo_think_time_ms,
    );
    this.strongSearchWorkerPool = createStrongSearchWorkerPool(
      config.strong_agent_max_threads,
      {
        thinkTimeMs: config.strong_agent_think_time_ms,
        depth: config.strong_agent_depth,
        transpositionEntries: config.strong_agent_transposition_entries,
        quiescenceDepth: config.strong_agent_quiescence_depth,
        bookPath: config.opening_book_path,
      },
    );
    this.agentDependencies = {
      config,
      monteCarloWorkerPool: this.monteCarloWorkerPool,
      strongSearchWorkerPool: this.strongSearchWorkerPool,
    };
  }

  async getAllAutomatedPlayers() {
    const agents = await this.agents.findAll();
    const availableAgents = [];

    for (const agent of agents) {
      if (!agent.enabled || !isSupportedAgentStrategy(agent.strategy) ||
        !isAgentStrategyAvailable(agent.strategy, this.config)) {
        continue;
      }
      availableAgents.push({
        id: agent.id,
        name: agent.name,
        strategy: agent.strategy,
        difficulty: agent.difficulty,
        elo: agent.elo,
        thinkTimeMs: this._getThinkTime(agent.strategy),
      });
    }
    return availableAgents;
  }

  async createAgentForGame(gameData, agentId) {
    const agent = await this.agents.findById(agentId);
    if (!agent || !agent.enabled || gameData.blackPlayerId !== agent.userId) {
      throw new AppError("The automated player is not configured for this game", 500, "INVALID_AGENT");
    }

    this._createGameAgent(gameData.id, agent);
  }

  async ensureAgentForGame(gameData) {
    if (!gameData.currentPlayerId || this.gameAgents.has(gameData.id)) {
      return this.gameAgents.has(gameData.id);
    }

    let agent = await this.agents.findByUserId(gameData.blackPlayerId);
    if (!agent) {
      agent = await this.agents.findByUserId(gameData.whitePlayerId);
    }
    if (!agent || !agent.enabled) {
      return false;
    }

    this._createGameAgent(gameData.id, agent);
    return true;
  }

  _createGameAgent(gameId, agent) {
    this.gameAgents.set(gameId, {
      userId: agent.userId,
      configuration: agent.config || {},
      player: createChessAgent(agent.strategy, this.agentDependencies),
    });
  }

  async playTurn(gameData) {
    const gameAgent = this.gameAgents.get(gameData.id);
    if (!gameAgent || gameData.currentPlayerId !== gameAgent.userId) {
      return null;
    }

    const selectedMove = await gameAgent.player.chooseMove(
      gameData,
      gameAgent.configuration,
    );
    try {
      return await this.gamesUseCases.makeMove(gameData.id, gameAgent.userId, {
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion,
      });
    } catch (error) {
      const gameChangedWhileQueued = ["GAME_NOT_ACTIVE", "NOT_PLAYER_TURN", "GAME_CONFLICT"]
        .includes(error.errorCode);
      if (!gameChangedWhileQueued) {
        throw error;
      }
      return {
        game: await this.gamesUseCases.getGame(gameData.id),
        move: null,
        skipped: true,
      };
    }
  }

  finishGame(gameId) {
    this.gameAgents.delete(gameId);
  }

  stop() {
    this.gameAgents.clear();
    this.monteCarloWorkerPool.stop();
    this.strongSearchWorkerPool.stop();
  }

  _getThinkTime(strategy) {
    if (strategy === "monte-carlo") return this.thinkTimeMs;
    if (strategy === "strong-search") return this.strongThinkTimeMs;
    if (strategy === "uci") return this.config.uci_engine_movetime_ms;
    if (strategy === "remote") return this.config.remote_engine_movetime_ms;
    return null;
  }
}

module.exports = AutomatedPlayersUseCases;
