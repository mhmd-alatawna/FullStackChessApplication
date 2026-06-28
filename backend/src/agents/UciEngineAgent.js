const { spawn } = require("node:child_process");
const { Chess } = require("chess.js");
const AppError = require("../AppError");

function parseEngineMove(response, gameData) {
  let candidate = response;
  if (candidate && typeof candidate === "object" && !candidate.from) {
    candidate = candidate.move || candidate.bestmove || candidate.bestMove || candidate.uci;
  }
  if (typeof candidate === "string") {
    candidate = candidate
      .replace(/e1h1/i, "e1g1").replace(/e1a1/i, "e1c1")
      .replace(/e8h8/i, "e8g8").replace(/e8a8/i, "e8c8");
    const match = candidate.match(/(?:bestmove\s+)?([a-h][1-8])([a-h][1-8])([qrbn])?/i);
    candidate = match ? { from: match[1].toLowerCase(), to: match[2].toLowerCase(), promotion: match[3]?.toLowerCase() || null } : null;
  }
  if (!candidate?.from || !candidate?.to) {
    throw new AppError("The UCI engine did not return a chess move", 502, "ENGINE_INVALID_RESPONSE");
  }

  const requested = {
    from: String(candidate.from).toLowerCase(),
    to: String(candidate.to).toLowerCase(),
    promotion: candidate.promotion ? String(candidate.promotion).toLowerCase() : null,
  };
  const board = new Chess(gameData.fen);
  const legalMove = board.moves({ verbose: true }).find((move) => {
    return move.from === requested.from && move.to === requested.to &&
      (move.promotion || null) === requested.promotion;
  });
  if (!legalMove) throw new AppError("The UCI engine returned an illegal move", 502, "ENGINE_ILLEGAL_MOVE", requested);
  return { from: legalMove.from, to: legalMove.to, promotion: legalMove.promotion || null };
}

class UciEngineAgent {
  constructor(defaults, fallbackAgent, spawnProcess = spawn) {
    this.defaults = defaults;
    this.fallbackAgent = fallbackAgent;
    this.spawnProcess = spawnProcess;
    this.lastFailure = null;
  }

  async chooseMove(gameData, configuration = {}) {
    const settings = { ...this.defaults, ...configuration };
    try {
      if (!settings.enginePath) {
        throw new AppError("A UCI engine path is not configured", 503, "UCI_ENGINE_NOT_CONFIGURED");
      }
      const response = await this._requestMove(gameData, settings);
      this.lastFailure = null;
      return parseEngineMove(response, gameData);
    } catch (error) {
      this.lastFailure = error;
      return this.fallbackAgent.chooseMove(gameData, configuration);
    }
  }

  _requestMove(gameData, settings) {
    const timeoutMs = this._number(settings.timeoutMs, 6000, 50, 120_000);
    const moveTimeMs = this._number(settings.movetimeMs || settings.thinkTimeMs, 1000, 10, timeoutMs);
    const depth = this._number(settings.depth, 18, 1, 128);

    return new Promise((resolve, reject) => {
      const engine = this.spawnProcess(settings.enginePath, settings.engineArgs || [], {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let buffer = "";
      let finished = false;
      const finish = (error, move) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (engine.exitCode === null) engine.kill();
        if (error) reject(error);
        else resolve(move);
      };
      const send = (command) => engine.stdin.write(`${command}\n`);
      const timer = setTimeout(() => {
        finish(new AppError("The UCI engine timed out", 504, "UCI_ENGINE_TIMEOUT"));
      }, timeoutMs);

      engine.once("error", (error) => finish(new AppError(error.message, 502, "UCI_ENGINE_FAILURE")));
      engine.once("exit", (code) => {
        if (!finished) finish(new AppError(`The UCI engine exited with code ${code}`, 502, "UCI_ENGINE_FAILURE"));
      });
      engine.stdout.setEncoding("utf8");
      engine.stdout.on("data", (chunk) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();
        for (const line of lines) {
          const message = line.trim();
          if (message === "uciok") {
            send("isready");
          } else if (message === "readyok") {
            send(`position fen ${gameData.fen}`);
            send(`go depth ${depth} movetime ${moveTimeMs}`);
          } else if (message.startsWith("bestmove ")) {
            finish(null, message);
          }
        }
      });
      send("uci");
    });
  }

  _number(value, fallback, minimum, maximum) {
    const number = Number(value ?? fallback);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.floor(number)));
  }
}

module.exports = UciEngineAgent;
