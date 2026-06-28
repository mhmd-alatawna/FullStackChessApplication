import ChessPiece from "./ChessPiece";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const backRank = ["r", "n", "b", "q", "k", "b", "n", "r"];
const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const displayOrder = { q: 0, r: 1, b: 2, n: 3, p: 4, k: 5 };

function startingBoard() {
  const board = {};
  files.forEach((file, index) => {
    board[`${file}1`] = { type: backRank[index], color: "white" };
    board[`${file}2`] = { type: "p", color: "white" };
    board[`${file}7`] = { type: "p", color: "black" };
    board[`${file}8`] = { type: backRank[index], color: "black" };
  });
  return board;
}

export function calculateCapturedMaterial(moves = []) {
  const board = startingBoard();
  const captured = { white: [], black: [] };

  for (const move of moves) {
    const uci = move?.uci || "";
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.slice(4, 5).toLowerCase();
    const movingPiece = board[from];
    if (!movingPiece || to.length !== 2) continue;

    let capturedSquare = to;
    let capturedPiece = board[to];
    if (movingPiece.type === "p" && from[0] !== to[0] && !capturedPiece) {
      capturedSquare = `${to[0]}${from[1]}`;
      capturedPiece = board[capturedSquare];
    }
    if (capturedPiece) {
      captured[movingPiece.color].push(capturedPiece.type);
      delete board[capturedSquare];
    }

    delete board[from];
    if (movingPiece.type === "k" && Math.abs(files.indexOf(from[0]) - files.indexOf(to[0])) === 2) {
      const kingSide = to[0] === "g";
      const rookFrom = `${kingSide ? "h" : "a"}${from[1]}`;
      const rookTo = `${kingSide ? "f" : "d"}${from[1]}`;
      board[rookTo] = board[rookFrom];
      delete board[rookFrom];
    }
    board[to] = { type: promotion || movingPiece.type, color: movingPiece.color };
  }

  captured.white.sort((left, right) => displayOrder[left] - displayOrder[right]);
  captured.black.sort((left, right) => displayOrder[left] - displayOrder[right]);
  const whitePoints = captured.white.reduce((total, piece) => total + pieceValues[piece], 0);
  const blackPoints = captured.black.reduce((total, piece) => total + pieceValues[piece], 0);
  return {
    white: { pieces: captured.white, advantage: Math.max(0, whitePoints - blackPoints) },
    black: { pieces: captured.black, advantage: Math.max(0, blackPoints - whitePoints) },
  };
}

export default function CapturedMaterial({ pieces, playerColor, advantage }) {
  const capturedColor = playerColor === "white" ? "black" : "white";
  return (
    <span className="captured-material" aria-label={`Captured material${advantage ? `, ahead by ${advantage}` : ""}`}>
      <span className="captured-pieces">
        {pieces.map((piece, index) => <ChessPiece type={piece} color={capturedColor} key={`${piece}-${index}`} />)}
      </span>
      {advantage > 0 && <strong className="material-advantage">+{advantage}</strong>}
    </span>
  );
}
