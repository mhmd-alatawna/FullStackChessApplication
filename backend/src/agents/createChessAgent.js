const AppError = require("../AppError");
const RandomChessAgent = require("./RandomChessAgent");
const HeuristicChessAgent = require("./HeuristicChessAgent");
const UciEngineAgent = require("./UciEngineAgent");
const RemoteEngineAgent = require("./RemoteEngineAgent");

const SUPPORTED_AGENT_STRATEGIES = Object.freeze(["random", "heuristic", "monte-carlo", "strong-search", "uci", "remote"]);

function isSupportedAgentStrategy(strategy) {
  return SUPPORTED_AGENT_STRATEGIES.includes(strategy);
}

function isAgentStrategyAvailable(strategy, config) {
  if (strategy === "uci") return Boolean(config.uci_engine_path);
  if (strategy === "remote") return Boolean(config.remote_engine_url);
  return isSupportedAgentStrategy(strategy);
}

function createFallbackAgent(strategy, dependencies) {
  if (strategy === "random") return new RandomChessAgent();
  if (strategy === "heuristic") return new HeuristicChessAgent();
  if (strategy === "monte-carlo") return dependencies.monteCarloWorkerPool;
  return dependencies.strongSearchWorkerPool;
}

function createChessAgent(strategy, dependencies) {
  if (strategy === "random") {
    return new RandomChessAgent();
  }
  if (strategy === "heuristic") {
    return new HeuristicChessAgent();
  }
  if (strategy === "monte-carlo") {
    return dependencies.monteCarloWorkerPool;
  }
  if (strategy === "strong-search") {
    return dependencies.strongSearchWorkerPool;
  }
  if (strategy === "uci") {
    if (!dependencies.config.uci_engine_path) {
      throw new AppError("A local UCI engine path is not configured", 503, "UCI_ENGINE_NOT_CONFIGURED");
    }
    const fallback = createFallbackAgent(dependencies.config.engine_fallback_agent, dependencies);
    return new UciEngineAgent({
      enginePath: dependencies.config.uci_engine_path,
      depth: dependencies.config.uci_engine_depth,
      movetimeMs: dependencies.config.uci_engine_movetime_ms,
      timeoutMs: dependencies.config.uci_engine_timeout_ms,
    }, fallback);
  }
  if (strategy === "remote") {
    if (!dependencies.config.remote_engine_url) {
      throw new AppError("A remote Stockfish URL is not configured", 503, "REMOTE_ENGINE_NOT_CONFIGURED");
    }
    const fallback = createFallbackAgent(dependencies.config.engine_fallback_agent, dependencies);
    return new RemoteEngineAgent({
      url: dependencies.config.remote_engine_url,
      token: dependencies.config.remote_engine_token,
      provider: dependencies.config.remote_engine_provider,
      depth: dependencies.config.remote_engine_depth,
      movetimeMs: dependencies.config.remote_engine_movetime_ms,
      timeoutMs: dependencies.config.remote_engine_timeout_ms,
    }, fallback);
  }
  throw new AppError(
    "The automated strategy is not supported",
    500,
    "AGENT_STRATEGY_NOT_SUPPORTED",
  );
}

module.exports = {
  SUPPORTED_AGENT_STRATEGIES,
  isSupportedAgentStrategy,
  isAgentStrategyAvailable,
  createChessAgent,
};
