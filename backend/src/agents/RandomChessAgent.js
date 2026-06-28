const { Chess } = require("chess.js");
const AppError = require("../AppError");

class RandomChessAgent {
  async chooseMove(gameData) {
    const board = new Chess(gameData.fen);
    const legalMoves = board.moves({ verbose: true });
    if (legalMoves.length === 0) {
      throw new AppError("The automated player has no legal move", 500, "AGENT_MOVE_NOT_FOUND");
    }

    const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion || null,
    };
  }
}

module.exports = RandomChessAgent;
