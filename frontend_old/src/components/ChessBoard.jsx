import { useState } from "react";

// Unicode chess piece icons indexed by [color][type]
const pieceIcons = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1]; // top to bottom for white's perspective

// Standalone, purely presentational chess board component.
// All game data comes from props — this component makes no API calls.
//
// Props:
//   gameState       — array of piece arrays [type, color, position, isAlive, hasMoved]
//   legalMoves      — array of { from, to } objects for the current player's turn
//   currentTurn     — "white" | "black"
//   playerColor     — the color this client is playing as
//   isCheck         — boolean, true when the current player's king is in check
//   onMove(from, to)— callback invoked when the player completes a move
//   onSelectionChange(bool) — notifies GamePage whether a piece is currently selected
//                             (used to pause polling during user interaction)
function ChessBoard({ gameState, legalMoves, currentTurn, playerColor, isCheck, onMove, onSelectionChange }) {
  // Currently selected square in algebraic notation, e.g. "e2"
  const [selected, setSelected] = useState(null);

  // Flip the board so the player always sees their own pieces at the bottom
  const ranks = playerColor === "black" ? [...RANKS].reverse() : RANKS;
  const files = playerColor === "black" ? [...FILES].reverse() : FILES;

  // Build a map of { position: { type, color } } for alive pieces only
  const pieceMap = {};
  if (Array.isArray(gameState)) {
    gameState.forEach((p) => {
      if (p[3]) pieceMap[p[2]] = { type: p[0], color: p[1] };
    });
  }

  // Squares the selected piece can legally move to
  const legalTargets = selected
    ? (legalMoves || []).filter((m) => m.from === selected).map((m) => m.to)
    : [];

  // Highlight the king's square red when in check
  let kingSquare = null;
  if (isCheck) {
    for (const [sq, p] of Object.entries(pieceMap)) {
      if (p.type === "king" && p.color === currentTurn) { kingSquare = sq; break; }
    }
  }

  // Handles clicks on any board square:
  // 1. If a piece is selected and the clicked square is a legal target → execute move
  // 2. If a piece is selected and the clicked square has another own piece → re-select
  // 3. Otherwise → deselect
  function handleSquareClick(sq) {
    if (selected) {
      if (legalTargets.includes(sq)) {
        // Valid move: send it to the parent and clear selection
        onMove(selected, sq);
        setSelected(null);
        onSelectionChange && onSelectionChange(false);
        return;
      }
      const piece = pieceMap[sq];
      if (piece && piece.color === playerColor) {
        // Switch selection to another own piece
        setSelected(sq);
        onSelectionChange && onSelectionChange(true);
      } else {
        // Click on empty or enemy square with no legal move → deselect
        setSelected(null);
        onSelectionChange && onSelectionChange(false);
      }
    } else {
      const piece = pieceMap[sq];
      // Only allow selecting own pieces on own turn
      if (piece && piece.color === playerColor && currentTurn === playerColor) {
        setSelected(sq);
        onSelectionChange && onSelectionChange(true);
      }
    }
  }

  return (
    <div className="chessboard">
      {ranks.map((rank) => (
        <div key={rank} className="board-row">
          {/* Rank label on the left (1–8) */}
          <span className="board-label rank-label">{rank}</span>
          {files.map((file) => {
            const sq = `${file}${rank}`;
            // Light squares: file index + rank is odd (standard chess coloring)
            const isLight = (FILES.indexOf(file) + rank) % 2 !== 0;
            const piece = pieceMap[sq];
            const isSelected = selected === sq;
            const isTarget = legalTargets.includes(sq);
            const isKingInCheck = kingSquare === sq;

            let squareClass = `board-square ${isLight ? "square-light" : "square-dark"}`;
            if (isSelected)    squareClass += " square-selected";
            if (isKingInCheck) squareClass += " square-check";

            return (
              <div key={sq} className={squareClass} onClick={() => handleSquareClick(sq)}>
                {/* Render the piece icon if this square is occupied */}
                {piece && (
                  <span className={`chess-piece piece-${piece.color}`}>
                    {pieceIcons[piece.color][piece.type]}
                  </span>
                )}
                {/* Legal move indicator: dot on empty squares, ring on capture squares */}
                {isTarget && !piece && <span className="legal-dot" />}
                {isTarget && piece  && <span className="capture-ring" />}
              </div>
            );
          })}
        </div>
      ))}
      {/* File labels at the bottom (a–h) */}
      <div className="board-row file-labels">
        <span className="board-label rank-label" />
        {files.map((f) => <span key={f} className="board-label file-label">{f}</span>)}
      </div>
    </div>
  );
}

export default ChessBoard;
