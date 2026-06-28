const { Chess } = require("chess.js");
const AppError = require("../AppError");

const MATE = 100000;
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

class HeuristicChessAgent {
  constructor(random = Math.random) {
    this.random = random;
  }

  async chooseMove(gameData) {
    const board = new Chess(gameData.fen);
    const legalMoves = board.moves({ verbose: true });
    if (legalMoves.length === 0) {
      throw new AppError("The automated player has no legal move", 500, "AGENT_MOVE_NOT_FOUND");
    }

    const color = board.turn();
    let bestScore = -Infinity;
    let bestMoves = [];
    for (const move of legalMoves) {
      board.move(move);
      const score = this._scoreAfterOpponentReply(board, color, move);
      board.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    const move = bestMoves[Math.floor(this.random() * bestMoves.length)];
    return { from: move.from, to: move.to, promotion: move.promotion || null };
  }

  _scoreAfterOpponentReply(board, color, playedMove) {
    if (board.isCheckmate()) return MATE;
    if (board.isDraw()) return 0;

    let worstReplyScore = Infinity;
    const replies = board.moves({ verbose: true });
    for (const reply of replies) {
      board.move(reply);
      let score = this._evaluate(board, color);
      if (board.isCheckmate()) score = board.turn() === color ? -MATE : MATE;
      if (board.isDraw()) score = 0;
      board.undo();
      worstReplyScore = Math.min(worstReplyScore, score);
    }

    if (playedMove.san.includes("+")) worstReplyScore += 8;
    if (playedMove.promotion) worstReplyScore += 15;
    if (playedMove.san === "O-O" || playedMove.san === "O-O-O") worstReplyScore += 20;
    return worstReplyScore;
  }

  _evaluate(board, color) {
    if (board.isDraw()) return 0;
    const opponent = color === "w" ? "b" : "w";
    const scores = { w: 0, b: 0 };
    const bishops = { w: 0, b: 0 };

    for (let rank = 0; rank < 8; rank += 1) {
      for (let file = 0; file < 8; file += 1) {
        const piece = board.get(`${"abcdefgh"[file]}${rank + 1}`);
        if (!piece) continue;
        scores[piece.color] += pieceValues[piece.type] + this._positionBonus(piece, file, rank);
        if (piece.type === "b") bishops[piece.color] += 1;
      }
    }

    if (bishops.w >= 2) scores.w += 25;
    if (bishops.b >= 2) scores.b += 25;
    const mobility = board.moves().length * 2;
    scores[board.turn()] += mobility;
    return scores[color] - scores[opponent];
  }

  _positionBonus(piece, file, rank) {
    const ownRank = piece.color === "w" ? rank : 7 - rank;
    const centerDistance = Math.abs(file - 3.5) + Math.abs(rank - 3.5);
    if (piece.type === "p") return ownRank * 7 - Math.abs(file - 3.5) * 2;
    if (piece.type === "n") return Math.round((7 - centerDistance) * 8);
    if (piece.type === "b") return Math.round((7 - centerDistance) * 5);
    if (piece.type === "r") return ownRank * 2;
    if (piece.type === "q") return Math.round((7 - centerDistance) * 2);
    if (piece.type === "k") return file === 2 || file === 6 ? 30 : -Math.round((7 - centerDistance) * 3);
    return 0;
  }
}

module.exports = HeuristicChessAgent;
