const WebSocket = require("ws");
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
    throw new AppError("The remote engine did not return a chess move", 502, "ENGINE_INVALID_RESPONSE");
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
  if (!legalMove) throw new AppError("The remote engine returned an illegal move", 502, "ENGINE_ILLEGAL_MOVE", requested);
  return { from: legalMove.from, to: legalMove.to, promotion: legalMove.promotion || null };
}

class RemoteEngineAgent {
  constructor(defaults, fallbackAgent, fetchFunction = fetch, WebSocketClass = WebSocket) {
    this.defaults = defaults;
    this.fallbackAgent = fallbackAgent;
    this.fetchFunction = fetchFunction;
    this.WebSocketClass = WebSocketClass;
    this.lastFailure = null;
  }

  async chooseMove(gameData, configuration = {}) {
    const settings = { ...this.defaults, ...configuration };
    try {
      if (!settings.url) {
        throw new AppError("A remote engine URL is not configured", 503, "REMOTE_ENGINE_NOT_CONFIGURED");
      }
      const stockfishOnline = settings.provider === "stockfish-online";
      const depth = this._number(settings.depth, stockfishOnline ? 15 : 18, 1, stockfishOnline ? 15 : 128);
      const payload = {
        fen: gameData.fen,
        moves: (gameData.moves || []).map((move) => move.uci),
        depth,
        movetime: this._number(settings.movetimeMs || settings.thinkTimeMs, 1000, 10, 120_000),
      };
      const response = settings.url.startsWith("ws")
        ? await this._requestWebSocket(settings, payload)
        : await this._requestHttp(settings, payload);
      this.lastFailure = null;
      return parseEngineMove(response, gameData);
    } catch (error) {
      this.lastFailure = error;
      return this.fallbackAgent.chooseMove(gameData, configuration);
    }
  }

  async _requestHttp(settings, payload) {
    const timeoutMs = this._number(settings.timeoutMs, 6000, 50, 120_000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = {};
      if (settings.token) headers.Authorization = `Bearer ${settings.token}`;
      let url = settings.url;
      let request;
      if (settings.provider === "stockfish-online") {
        url = new URL(settings.url);
        url.searchParams.set("fen", payload.fen);
        url.searchParams.set("depth", payload.depth);
        request = { method: "GET", headers, signal: controller.signal };
      } else {
        headers["Content-Type"] = "application/json";
        request = { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal };
      }
      const response = await this.fetchFunction(url, request);
      if (!response.ok) {
        throw new AppError(`The remote engine returned HTTP ${response.status}`, 502, "REMOTE_ENGINE_FAILURE");
      }
      return response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new AppError("The remote engine timed out", 504, "REMOTE_ENGINE_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  _requestWebSocket(settings, payload) {
    const timeoutMs = this._number(settings.timeoutMs, 6000, 50, 120_000);
    return new Promise((resolve, reject) => {
      const headers = settings.token ? { Authorization: `Bearer ${settings.token}` } : undefined;
      const socket = new this.WebSocketClass(settings.url, { headers });
      let finished = false;
      const finish = (error, response) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        socket.close();
        if (error) reject(error);
        else resolve(response);
      };
      const timer = setTimeout(() => finish(new AppError("The remote engine timed out", 504, "REMOTE_ENGINE_TIMEOUT")), timeoutMs);
      socket.once("open", () => socket.send(JSON.stringify(payload)));
      socket.once("message", (data) => {
        try {
          finish(null, JSON.parse(data.toString()));
        } catch (error) {
          finish(new AppError("The remote engine returned invalid JSON", 502, "ENGINE_INVALID_RESPONSE"));
        }
      });
      socket.once("error", (error) => finish(new AppError(error.message, 502, "REMOTE_ENGINE_FAILURE")));
    });
  }

  _number(value, fallback, minimum, maximum) {
    const number = Number(value ?? fallback);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.floor(number)));
  }
}

module.exports = RemoteEngineAgent;
