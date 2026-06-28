const { Chess } = require("chess.js");
const { performance } = require("node:perf_hooks");
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");
const AppError = require("../AppError");

const PIECE_VALUES = Object.freeze({
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
});

class MonteCarloChessAgent {
  constructor(random = Math.random) {
    this.random = random;
  }

  async chooseMove(gameData, configuration = {}) {
    const board = new Chess(gameData.fen);
    const legalMoves = board.moves({ verbose: true });
    if (legalMoves.length === 0) {
      throw new AppError("The automated player has no legal move", 500, "AGENT_MOVE_NOT_FOUND");
    }

    const immediateMate = legalMoves.find((move) => move.san.endsWith("#"));
    if (immediateMate) {
      return this._compactMove(immediateMate);
    }
    if (legalMoves.length === 1) {
      return this._compactMove(legalMoves[0]);
    }

    const thinkTimeMs = this._boundedNumber(configuration.thinkTimeMs, 400, 25, 5000);
    const rolloutDepth = this._boundedNumber(configuration.rolloutDepth, 14, 4, 40);
    const exploration = this._boundedNumber(configuration.exploration, 1.25, 0.1, 3);
    const rootColor = board.turn();
    const root = this._createNode(null, null, board);
    const deadline = performance.now() + thinkTimeMs;
    let iterations = 0;

    while (iterations === 0 || performance.now() < deadline) {
      for (let batchIndex = 0; batchIndex < 8; batchIndex += 1) {
        if (iterations > 0 && performance.now() >= deadline) {
          break;
        }
        this._runSimulation(root, gameData.fen, rootColor, rolloutDepth, exploration);
        iterations += 1;
      }
      if (performance.now() < deadline) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    const bestChild = this._selectBestRootChild(root, legalMoves, gameData.fen, rootColor);

    return this._compactMove(bestChild.move);
  }

  _runSimulation(root, fen, rootColor, rolloutDepth, exploration) {
    const board = new Chess(fen);
    let node = root;

    while (node.untriedMoves.length === 0 && node.children.length > 0 && !board.isGameOver()) {
      node = this._selectChild(node, board.turn(), rootColor, exploration);
      board.move(node.move);
    }

    if (node.untriedMoves.length > 0 && !board.isGameOver()) {
      const move = node.untriedMoves.pop();
      board.move(move);
      const child = this._createNode(move, node, board);
      node.children.push(child);
      node = child;
    }

    const result = this._rollout(board, rootColor, rolloutDepth);
    while (node) {
      node.visits += 1;
      node.totalValue += result;
      node = node.parent;
    }
  }

  _selectChild(node, playerToMove, rootColor, exploration) {
    const parentVisits = Math.max(1, node.visits);
    return node.children.reduce((best, child) => {
      const averageValue = child.totalValue / child.visits;
      const exploitation = playerToMove === rootColor ? averageValue : -averageValue;
      const explorationValue = exploration * Math.sqrt(Math.log(parentVisits) / child.visits);
      const score = exploitation + explorationValue;
      if (!best || score > best.score) {
        return { child, score };
      }
      return best;
    }, null).child;
  }

  _selectBestRootChild(root, legalMoves, fen, rootColor) {
    return root.children.reduce((best, child) => {
      const averageValue = child.totalValue / child.visits;
      const confidence = child.visits / (child.visits + 4);
      const verboseMove = legalMoves.find((move) => {
        return move.from === child.move.from &&
          move.to === child.move.to &&
          (move.promotion || null) === child.move.promotion;
      });
      const score = averageValue * confidence +
        this._rootMoveBias(fen, verboseMove, rootColor) +
        Math.log(child.visits + 1) * 0.005;

      if (!best || score > best.score) {
        return { child, score };
      }
      return best;
    }, null).child;
  }

  _rootMoveBias(fen, move, rootColor) {
    const board = new Chess(fen);
    board.move(move);
    const opponentHasMate = board.moves({ verbose: true }).some((reply) => reply.san.endsWith("#"));
    if (opponentHasMate) {
      return -2;
    }

    const positionBias = Math.tanh(this._evaluate(board, rootColor) / 300) * 0.15;
    const moveBias = Math.tanh(this._movePriority(move) / 250) * 0.25;
    return positionBias + moveBias;
  }

  _rollout(board, rootColor, rolloutDepth) {
    for (let depth = 0; depth < rolloutDepth && !board.isGameOver(); depth += 1) {
      const moves = board.moves({ verbose: true });
      const move = this._chooseRolloutMove(moves);
      board.move(move);
    }

    if (board.isCheckmate()) {
      return board.turn() === rootColor ? -1 : 1;
    }
    if (board.isDraw()) {
      return 0;
    }

    const evaluation = this._evaluate(board, rootColor);
    return Math.tanh(evaluation / 700) * 0.9;
  }

  _chooseRolloutMove(moves) {
    if (this.random() < 0.12) {
      return moves[Math.floor(this.random() * moves.length)];
    }

    const orderedMoves = [...moves].sort((first, second) => {
      return this._movePriority(second) - this._movePriority(first);
    });
    const candidateCount = Math.min(4, orderedMoves.length);
    const randomValue = this.random();
    const candidateIndex = Math.floor(randomValue * randomValue * candidateCount);
    return orderedMoves[candidateIndex];
  }

  _createNode(move, parent, board) {
    const untriedMoves = board.moves({ verbose: true }).sort((first, second) => {
      return this._movePriority(first) - this._movePriority(second);
    });
    return {
      move: move ? this._compactMove(move) : null,
      parent,
      children: [],
      untriedMoves: untriedMoves.map((candidate) => this._compactMove(candidate)),
      visits: 0,
      totalValue: 0,
    };
  }

  _movePriority(move) {
    let priority = 0;
    if (move.san.endsWith("#")) {
      return 100000;
    }
    if (move.captured) {
      priority += PIECE_VALUES[move.captured] * 10 - PIECE_VALUES[move.piece];
    }
    if (move.promotion) {
      priority += PIECE_VALUES[move.promotion] + 700;
    }
    if (move.san.includes("+")) {
      priority += 120;
    }
    if (move.san === "O-O" || move.san === "O-O-O") {
      priority += 80;
    }
    if (move.piece === "p" && ["d4", "e4", "d5", "e5"].includes(move.to)) {
      priority += 70;
    }
    if (move.piece === "n" && ["c3", "f3", "c6", "f6"].includes(move.to)) {
      priority += 55;
    }
    if (move.piece === "q" && !move.captured && !move.san.includes("+")) {
      priority -= 25;
    }
    const file = move.to.charCodeAt(0) - 97;
    const rank = Number(move.to[1]) - 1;
    const centerDistance = Math.abs(file - 3.5) + Math.abs(rank - 3.5);
    priority += Math.round((7 - centerDistance) * 4);
    return priority;
  }

  _evaluate(board, rootColor) {
    let whiteScore = 0;
    let blackScore = 0;
    const squares = board.board();

    for (let row = 0; row < squares.length; row += 1) {
      for (let file = 0; file < squares[row].length; file += 1) {
        const piece = squares[row][file];
        if (!piece) {
          continue;
        }
        const score = PIECE_VALUES[piece.type] + this._positionValue(piece, row, file);
        if (piece.color === "w") {
          whiteScore += score;
        } else {
          blackScore += score;
        }
      }
    }

    const mobility = board.moves().length * 2;
    if (board.turn() === "w") {
      whiteScore += mobility;
      if (board.isCheck()) {
        whiteScore -= 35;
      }
    } else {
      blackScore += mobility;
      if (board.isCheck()) {
        blackScore -= 35;
      }
    }

    const whitePerspective = whiteScore - blackScore;
    return rootColor === "w" ? whitePerspective : -whitePerspective;
  }

  _positionValue(piece, row, file) {
    const centerDistance = Math.abs(file - 3.5) + Math.abs(row - 3.5);
    const advancement = piece.color === "w" ? 6 - row : row - 1;

    if (piece.type === "p") {
      return advancement * 9 - Math.round(centerDistance * 2);
    }
    if (piece.type === "n") {
      return Math.round((7 - centerDistance) * 8);
    }
    if (piece.type === "b") {
      return Math.round((7 - centerDistance) * 5);
    }
    if (piece.type === "r") {
      return advancement * 2;
    }
    if (piece.type === "q") {
      return Math.round((7 - centerDistance) * 2);
    }
    if (piece.type === "k") {
      const isCastledFile = file === 2 || file === 6;
      return isCastledFile ? 35 : -Math.round((7 - centerDistance) * 4);
    }
    return 0;
  }

  _compactMove(move) {
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion || null,
    };
  }

  _boundedNumber(value, defaultValue, minimum, maximum) {
    const number = Number(value ?? defaultValue);
    if (!Number.isFinite(number)) {
      return defaultValue;
    }
    return Math.min(maximum, Math.max(minimum, number));
  }
}

function createMonteCarloWorkerPool(maxThreads, thinkTimeMs) {
  const queue = [];
  const workers = new Set();
  let stopped = false;

  function startQueuedWork() {
    while (!stopped && workers.size < Math.max(1, Number(maxThreads)) && queue.length > 0) {
      const job = queue.shift();
      const worker = new Worker(__filename, {
        workerData: {
          agentWorker: "monte-carlo",
          gameData: job.gameData,
          configuration: { ...job.configuration, thinkTimeMs: Math.max(25, Number(thinkTimeMs)) },
        },
      });
      workers.add(worker);
      let completed = false;

      function finish(error, move) {
        if (completed) return;
        completed = true;
        if (error) job.reject(error);
        else job.resolve(move);
        worker.terminate().finally(() => {
          workers.delete(worker);
          startQueuedWork();
        });
      }

      worker.once("message", (response) => {
        if (response.success) finish(null, response.data);
        else finish(new AppError(response.error.message, response.error.statusCode, response.error.code, response.error.details));
      });
      worker.once("error", (error) => finish(error));
      worker.once("exit", (code) => {
        if (code !== 0 && !completed) finish(new AppError("The Monte Carlo worker exited unexpectedly", 500, "AGENT_WORKER_ERROR"));
      });
    }
  }

  return {
    chooseMove(gameData, configuration = {}) {
      if (stopped) throw new AppError("The Monte Carlo worker pool is stopped", 503, "AGENT_WORKER_STOPPED");
      return new Promise((resolve, reject) => {
        queue.push({ gameData, configuration, resolve, reject });
        startQueuedWork();
      });
    },
    stop() {
      stopped = true;
      const error = new AppError("The Monte Carlo worker pool is stopped", 503, "AGENT_WORKER_STOPPED");
      for (const job of queue.splice(0)) job.reject(error);
      for (const worker of workers) worker.terminate();
      workers.clear();
    },
  };
}

async function runMonteCarloWorker() {
  try {
    const move = await new MonteCarloChessAgent().chooseMove(workerData.gameData, workerData.configuration);
    parentPort.postMessage({ success: true, data: move, error: null });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      data: null,
      error: {
        code: error.errorCode || "AGENT_WORKER_ERROR",
        message: error.message || "The Monte Carlo worker failed",
        details: error.details || {},
        statusCode: error.statusCode || 500,
      },
    });
  }
}

if (!isMainThread && workerData?.agentWorker === "monte-carlo") {
  runMonteCarloWorker();
}

module.exports = MonteCarloChessAgent;
module.exports.createWorkerPool = createMonteCarloWorkerPool;
