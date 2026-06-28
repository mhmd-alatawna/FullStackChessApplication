const { Chess } = require("chess.js");
const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");
const AppError = require("../AppError");

function compactMove(move) {
  return { from: move.from, to: move.to, promotion: move.promotion || null };
}

function moveToUci(move) {
  return `${move.from}${move.to}${move.promotion || ""}`;
}

function parseBookMove(candidate, gameData) {
  if (candidate && typeof candidate === "object") {
    candidate = candidate.move || candidate.uci;
  }
  if (typeof candidate !== "string") return null;

  candidate = candidate
    .replace(/e1h1/i, "e1g1").replace(/e1a1/i, "e1c1")
    .replace(/e8h8/i, "e8g8").replace(/e8a8/i, "e8c8");
  const match = candidate.match(/([a-h][1-8])([a-h][1-8])([qrbn])?/i);
  if (!match) return null;

  const board = new Chess(gameData.fen);
  const requested = { from: match[1].toLowerCase(), to: match[2].toLowerCase(), promotion: match[3]?.toLowerCase() || null };
  const legalMove = board.moves({ verbose: true }).find((move) => {
    return move.from === requested.from && move.to === requested.to &&
      (move.promotion || null) === requested.promotion;
  });
  return legalMove ? compactMove(legalMove) : null;
}

class OpeningBook {
  constructor(bookPath = "", random = Math.random) {
    this.bookPath = bookPath;
    this.random = random;
    this.positions = null;
  }

  async findMove(gameData) {
    if (!this.bookPath) return null;
    if (path.extname(this.bookPath).toLowerCase() === ".bin") {
      return this._findPolyglotMove(gameData);
    }

    if (this.positions === null) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.bookPath, "utf8"));
        this.positions = parsed.positions || parsed;
      } catch (error) {
        this.positions = false;
      }
    }
    if (!this.positions) return null;

    const key = gameData.fen.split(" ").slice(0, 4).join(" ");
    const entries = this.positions[key];
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const moves = entries.map((entry) => {
      if (typeof entry === "string") return { move: entry, weight: 1 };
      return { move: entry.move || entry.uci, weight: Math.max(1, Number(entry.weight) || 1) };
    }).filter((entry) => entry.move);
    let selection = this.random() * moves.reduce((total, entry) => total + entry.weight, 0);
    for (const entry of moves) {
      selection -= entry.weight;
      if (selection <= 0) return parseBookMove(entry.move, gameData);
    }
    return parseBookMove(moves.at(-1)?.move, gameData);
  }

  async _findPolyglotMove(gameData) {
    let book;
    try {
      const { Polyglot } = await import("chess-openings");
      book = new Polyglot(this.bookPath);
      await book.open();
      const entry = await book.lookup(gameData.fen);
      if (!entry) return null;
      const continuation = entry.pickMove();
      return parseBookMove(typeof continuation === "string" ? continuation : continuation?.move, gameData);
    } catch (error) {
      return null;
    } finally {
      await book?.close().catch(() => {});
    }
  }
}

const INFINITY = 1_000_000;
const MATE_SCORE = 100_000;
const MATE_THRESHOLD = 90_000;
const PIECE_VALUES = Object.freeze({ p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 });
const BOUND = Object.freeze({ EXACT: "exact", LOWER: "lower", UPPER: "upper" });

const TABLES = Object.freeze({
  p: [
    0,0,0,0,0,0,0,0, 5,10,10,-20,-20,10,10,5, 5,-5,-10,0,0,-10,-5,5, 0,0,0,20,20,0,0,0,
    5,5,10,25,25,10,5,5, 10,10,20,30,30,20,10,10, 50,50,50,50,50,50,50,50, 0,0,0,0,0,0,0,0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,5,5,0,-20,-40, -30,5,10,15,15,10,5,-30, -30,0,15,20,20,15,0,-30,
    -30,5,15,20,20,15,5,-30, -30,0,10,15,15,10,0,-30, -40,-20,0,0,0,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20, -10,5,0,0,0,0,5,-10, -10,10,10,10,10,10,10,-10, -10,0,10,10,10,10,0,-10,
    -10,5,5,10,10,5,5,-10, -10,0,5,10,10,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
    0,0,0,5,5,0,0,0, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
    -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 5,10,10,10,10,10,10,5, 0,0,0,0,0,0,0,0,
  ],
  q: [
    -20,-10,-10,-5,-5,-10,-10,-20, -10,0,5,0,0,0,0,-10, -10,5,5,5,5,5,0,-10, 0,0,5,5,5,5,0,-5,
    -5,0,5,5,5,5,0,-5, -10,0,5,5,5,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20,
  ],
  kingMiddle: [
    20,30,10,0,0,10,30,20, 20,20,0,0,0,0,20,20, -10,-20,-20,-20,-20,-20,-20,-10, -20,-30,-30,-40,-40,-30,-30,-20,
    -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
  ],
  kingEnd: [
    -50,-30,-30,-30,-30,-30,-30,-50, -30,-30,0,0,0,0,-30,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
    -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-20,-10,0,0,-10,-20,-30, -50,-40,-30,-20,-20,-30,-40,-50,
  ],
});

class SearchTimeout extends Error {}

class StrongSearchAgent {
  constructor(defaults = {}) {
    this.defaults = defaults;
    this.transpositionTable = new Map();
    this.history = new Map();
    this.killers = [];
    this.lastSearch = null;
    this.nodes = 0;
  }

  async chooseMove(gameData, configuration = {}) {
    const board = new Chess(gameData.fen);
    const legalMoves = board.moves({ verbose: true });
    if (legalMoves.length === 0) {
      throw new AppError("The automated player has no legal move", 500, "AGENT_MOVE_NOT_FOUND");
    }

    const settings = { ...this.defaults, ...configuration };
    const book = new OpeningBook(settings.bookPath || settings.openingBookPath || "");
    const bookMove = await book.findMove(gameData);
    if (bookMove) {
      this.lastSearch = { completedDepth: 0, nodes: 0, score: null, source: "book" };
      return bookMove;
    }

    const thinkTimeMs = this._number(settings.thinkTimeMs, 1000, 10, 60_000);
    const maximumDepth = this._number(settings.depth, 64, 1, 128);
    const safetyMargin = Math.min(15, Math.max(2, thinkTimeMs * 0.03));
    this.deadline = performance.now() + Math.max(1, thinkTimeMs - safetyMargin);
    this.maxQuiescenceDepth = this._number(settings.quiescenceDepth, 10, 2, 24);
    this.maxTableEntries = this._number(settings.transpositionEntries, 200_000, 1_000, 2_000_000);
    this.nodes = 0;
    this.killers = [];
    this.history.clear();
    if (this.transpositionTable.size > this.maxTableEntries) {
      this.transpositionTable.clear();
    }

    let bestMove = compactMove(this._orderMoves(board, legalMoves, null, 0)[0]);
    let bestScore = -INFINITY;
    let completedDepth = 0;
    const startedAt = performance.now();

    for (let depth = 1; depth <= maximumDepth; depth += 1) {
      try {
        const result = this._searchRoot(board, depth);
        bestMove = compactMove(result.move);
        bestScore = result.score;
        completedDepth = depth;
        if (Math.abs(bestScore) >= MATE_THRESHOLD) {
          break;
        }
      } catch (error) {
        if (!(error instanceof SearchTimeout)) {
          throw error;
        }
        break;
      }
    }

    this.lastSearch = {
      completedDepth,
      nodes: this.nodes,
      score: bestScore,
      elapsedMs: performance.now() - startedAt,
      source: "search",
    };
    return bestMove;
  }

  _searchRoot(board, depth) {
    this._checkTime();
    const entry = this.transpositionTable.get(this._positionKey(board));
    const moves = this._orderMoves(board, board.moves({ verbose: true }), entry?.bestMove, 0);
    let bestMove = moves[0];
    let bestScore = -INFINITY;
    let alpha = -INFINITY;

    for (const move of moves) {
      this._checkTime();
      board.move(move);
      const score = -this._negamax(board, depth - 1, -INFINITY, -alpha, 1);
      board.undo();
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) {
        alpha = score;
      }
    }
    this.transpositionTable.set(this._positionKey(board), {
      depth,
      score: this._scoreToTable(bestScore, 0),
      bound: BOUND.EXACT,
      bestMove: moveToUci(bestMove),
    });
    return { move: bestMove, score: bestScore };
  }

  _negamax(board, depth, alpha, beta, ply) {
    this._checkTime();
    this.nodes += 1;
    if (board.isCheckmate()) {
      return -MATE_SCORE + ply;
    }
    if (board.isDraw() || board.isStalemate()) {
      return 0;
    }
    if (depth <= 0) {
      return this._quiescence(board, alpha, beta, ply, 0);
    }

    const key = this._positionKey(board);
    const originalAlpha = alpha;
    const entry = this.transpositionTable.get(key);
    if (entry && entry.depth >= depth) {
      const score = this._scoreFromTable(entry.score, ply);
      if (entry.bound === BOUND.EXACT) return score;
      if (entry.bound === BOUND.LOWER) alpha = Math.max(alpha, score);
      if (entry.bound === BOUND.UPPER) beta = Math.min(beta, score);
      if (alpha >= beta) return score;
    }

    const moves = this._orderMoves(board, board.moves({ verbose: true }), entry?.bestMove, ply);
    let bestScore = -INFINITY;
    let bestMove = null;
    for (const move of moves) {
      this._checkTime();
      board.move(move);
      const score = -this._negamax(board, depth - 1, -beta, -alpha, ply + 1);
      board.undo();
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (alpha >= beta) {
        if (!move.captured && !move.promotion) {
          this._recordKiller(ply, move);
          const historyKey = `${move.color}:${moveToUci(move)}`;
          this.history.set(historyKey, (this.history.get(historyKey) || 0) + depth * depth);
        }
        break;
      }
    }

    let bound = BOUND.EXACT;
    if (bestScore <= originalAlpha) bound = BOUND.UPPER;
    else if (bestScore >= beta) bound = BOUND.LOWER;
    this.transpositionTable.set(key, {
      depth,
      score: this._scoreToTable(bestScore, ply),
      bound,
      bestMove: bestMove ? moveToUci(bestMove) : null,
    });
    return bestScore;
  }

  _quiescence(board, alpha, beta, ply, quiescenceDepth) {
    this._checkTime();
    this.nodes += 1;
    if (board.isCheckmate()) return -MATE_SCORE + ply;
    if (board.isDraw() || board.isStalemate()) return 0;

    const inCheck = board.isCheck();
    const standPat = this._evaluate(board);
    if (!inCheck) {
      if (standPat >= beta) return beta;
      alpha = Math.max(alpha, standPat);
    }
    if (quiescenceDepth >= this.maxQuiescenceDepth) {
      return inCheck ? standPat - 40 : alpha;
    }

    let moves = board.moves({ verbose: true });
    if (!inCheck) {
      moves = moves.filter((move) => move.captured || move.promotion || move.san.includes("+"));
    }
    moves = this._orderMoves(board, moves, null, ply);
    for (const move of moves) {
      this._checkTime();
      board.move(move);
      const score = -this._quiescence(board, -beta, -alpha, ply + 1, quiescenceDepth + 1);
      board.undo();
      if (score >= beta) return beta;
      alpha = Math.max(alpha, score);
    }
    return alpha;
  }

  _orderMoves(board, moves, hashMove, ply) {
    const killers = this.killers[ply] || [];
    return moves.map((move) => {
      const uci = moveToUci(move);
      let score = 0;
      if (uci === hashMove) score += 2_000_000;
      if (move.san.endsWith("#")) score += 1_500_000;
      if (move.captured) score += 1_000_000 + PIECE_VALUES[move.captured] * 16 - PIECE_VALUES[move.piece];
      if (move.promotion) score += 800_000 + PIECE_VALUES[move.promotion];
      if (move.san.includes("+")) score += 500_000;
      const killerIndex = killers.indexOf(uci);
      if (killerIndex >= 0) score += 300_000 - killerIndex * 10_000;
      score += this.history.get(`${move.color}:${uci}`) || 0;
      return { move, score };
    }).sort((first, second) => second.score - first.score).map((entry) => entry.move);
  }

  _recordKiller(ply, move) {
    const uci = moveToUci(move);
    const killers = this.killers[ply] || [];
    if (killers[0] !== uci) {
      this.killers[ply] = [uci, killers[0]].filter(Boolean);
    }
  }

  _evaluate(board) {
    const squares = board.board();
    const pieces = [];
    let nonPawnMaterial = 0;
    for (let row = 0; row < 8; row += 1) {
      for (let file = 0; file < 8; file += 1) {
        const piece = squares[row][file];
        if (piece) {
          pieces.push({ ...piece, row, file });
          if (!["p", "k"].includes(piece.type)) nonPawnMaterial += PIECE_VALUES[piece.type];
        }
      }
    }
    const middleGameWeight = Math.min(1, nonPawnMaterial / 6200);
    let white = 0;
    let black = 0;
    const bishops = { w: 0, b: 0 };

    for (const piece of pieces) {
      const index = piece.color === "w" ? (7 - piece.row) * 8 + piece.file : piece.row * 8 + piece.file;
      let positional = 0;
      if (piece.type === "k") {
        positional = TABLES.kingMiddle[index] * middleGameWeight + TABLES.kingEnd[index] * (1 - middleGameWeight);
      } else {
        positional = TABLES[piece.type][index];
      }
      const mobility = this._pieceMobility(squares, piece) * (piece.type === "q" ? 1 : 2);
      const value = PIECE_VALUES[piece.type] + positional + mobility;
      if (piece.type === "b") bishops[piece.color] += 1;
      if (piece.color === "w") white += value;
      else black += value;
    }

    if (bishops.w >= 2) white += 35;
    if (bishops.b >= 2) black += 35;
    const pawnScores = this._evaluatePawns(pieces);
    white += pawnScores.w;
    black += pawnScores.b;
    const kingScores = this._evaluateKingSafety(squares, pieces, middleGameWeight);
    white += kingScores.w;
    black += kingScores.b;

    const whitePerspective = white - black;
    return board.turn() === "w" ? whitePerspective : -whitePerspective;
  }

  _pieceMobility(squares, piece) {
    const directions = {
      b: [[-1,-1],[-1,1],[1,-1],[1,1]],
      r: [[-1,0],[1,0],[0,-1],[0,1]],
      q: [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]],
    };
    if (piece.type === "n") {
      return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].filter(([row, file]) => {
        const target = squares[piece.row + row]?.[piece.file + file];
        return piece.row + row >= 0 && piece.row + row < 8 && piece.file + file >= 0 && piece.file + file < 8 && (!target || target.color !== piece.color);
      }).length;
    }
    if (piece.type === "k") {
      return [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].filter(([row, file]) => {
        const target = squares[piece.row + row]?.[piece.file + file];
        return target === null || (target && target.color !== piece.color);
      }).length;
    }
    if (!directions[piece.type]) return 0;
    let mobility = 0;
    for (const [rowStep, fileStep] of directions[piece.type]) {
      let row = piece.row + rowStep;
      let file = piece.file + fileStep;
      while (row >= 0 && row < 8 && file >= 0 && file < 8) {
        const target = squares[row][file];
        if (!target) mobility += 1;
        else {
          if (target.color !== piece.color) mobility += 1;
          break;
        }
        row += rowStep;
        file += fileStep;
      }
    }
    return mobility;
  }

  _evaluatePawns(pieces) {
    const scores = { w: 0, b: 0 };
    for (const color of ["w", "b"]) {
      const pawns = pieces.filter((piece) => piece.type === "p" && piece.color === color);
      const enemies = pieces.filter((piece) => piece.type === "p" && piece.color !== color);
      const files = Array(8).fill(0);
      for (const pawn of pawns) files[pawn.file] += 1;
      for (const pawn of pawns) {
        if (files[pawn.file] > 1) scores[color] -= 14;
        if ((files[pawn.file - 1] || 0) === 0 && (files[pawn.file + 1] || 0) === 0) scores[color] -= 12;
        const passed = !enemies.some((enemy) => {
          const sameLane = Math.abs(enemy.file - pawn.file) <= 1;
          const ahead = color === "w" ? enemy.row < pawn.row : enemy.row > pawn.row;
          return sameLane && ahead;
        });
        if (passed) {
          const advancement = color === "w" ? 6 - pawn.row : pawn.row - 1;
          scores[color] += 12 + advancement * advancement * 3;
        }
      }
    }
    return scores;
  }

  _evaluateKingSafety(squares, pieces, middleGameWeight) {
    const scores = { w: 0, b: 0 };
    for (const color of ["w", "b"]) {
      const king = pieces.find((piece) => piece.type === "k" && piece.color === color);
      if (!king) continue;
      const direction = color === "w" ? -1 : 1;
      let shield = 0;
      for (const fileOffset of [-1, 0, 1]) {
        const piece = squares[king.row + direction]?.[king.file + fileOffset];
        if (piece?.type === "p" && piece.color === color) shield += 1;
      }
      scores[color] += shield * 14 * middleGameWeight;
      if ([2, 6].includes(king.file)) scores[color] += 22 * middleGameWeight;
      const ownFilePawns = pieces.some((piece) => piece.type === "p" && piece.color === color && piece.file === king.file);
      if (!ownFilePawns) scores[color] -= 16 * middleGameWeight;
    }
    return scores;
  }

  _positionKey(board) {
    return board.fen().split(" ").slice(0, 5).join(" ");
  }

  _scoreToTable(score, ply) {
    if (score > MATE_THRESHOLD) return score + ply;
    if (score < -MATE_THRESHOLD) return score - ply;
    return score;
  }

  _scoreFromTable(score, ply) {
    if (score > MATE_THRESHOLD) return score - ply;
    if (score < -MATE_THRESHOLD) return score + ply;
    return score;
  }

  _checkTime() {
    if (performance.now() >= this.deadline) {
      throw new SearchTimeout();
    }
  }

  _number(value, fallback, minimum, maximum) {
    const parsed = Number(value ?? fallback);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
  }
}

function createStrongSearchWorkerPool(maxThreads, defaults) {
  const queue = [];
  const workers = new Set();
  let stopped = false;

  function startQueuedWork() {
    while (!stopped && workers.size < Math.max(1, Number(maxThreads)) && queue.length > 0) {
      const job = queue.shift();
      const worker = new Worker(__filename, {
        workerData: { agentWorker: "strong-search", gameData: job.gameData, configuration: job.configuration, defaults },
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
        if (code !== 0 && !completed) finish(new AppError("The search worker exited unexpectedly", 500, "AGENT_WORKER_ERROR"));
      });
    }
  }

  return {
    chooseMove(gameData, configuration = {}) {
      if (stopped) throw new AppError("The search worker pool is stopped", 503, "AGENT_WORKER_STOPPED");
      return new Promise((resolve, reject) => {
        queue.push({ gameData, configuration, resolve, reject });
        startQueuedWork();
      });
    },
    stop() {
      stopped = true;
      const error = new AppError("The search worker pool is stopped", 503, "AGENT_WORKER_STOPPED");
      for (const job of queue.splice(0)) job.reject(error);
      for (const worker of workers) worker.terminate();
      workers.clear();
    },
  };
}

async function runStrongSearchWorker() {
  try {
    const agent = new StrongSearchAgent(workerData.defaults);
    const move = await agent.chooseMove(workerData.gameData, workerData.configuration);
    parentPort.postMessage({ success: true, data: move, error: null });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      data: null,
      error: {
        code: error.errorCode || "AGENT_WORKER_ERROR",
        message: error.message || "The search worker failed",
        details: error.details || {},
        statusCode: error.statusCode || 500,
      },
    });
  }
}

if (!isMainThread && workerData?.agentWorker === "strong-search") {
  runStrongSearchWorker();
}

module.exports = StrongSearchAgent;
module.exports.createWorkerPool = createStrongSearchWorkerPool;
