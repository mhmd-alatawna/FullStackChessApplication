import { useEffect, useMemo, useState } from "react";
import ChessPiece from "./ChessPiece";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

function parseFen(fen) {
  const pieces = {};
  String(fen || "").split(" ")[0].split("/").forEach((row, rowIndex) => {
    let fileIndex = 0;
    for (const value of row) {
      if (/\d/.test(value)) {
        fileIndex += Number(value);
      } else {
        pieces[`${files[fileIndex]}${8 - rowIndex}`] = {
          type: value,
          color: value === value.toUpperCase() ? "white" : "black",
        };
        fileIndex += 1;
      }
    }
  });
  return pieces;
}

export default function ChessBoard({ fen, legalMoves, orientation, lastMove, canMove, onMove, onPromotion }) {
  const [selected, setSelected] = useState(null);
  const pieces = useMemo(() => parseFen(fen), [fen]);
  const boardFiles = orientation === "black" ? [...files].reverse() : files;
  const boardRanks = orientation === "black" ? [...ranks].reverse() : ranks;
  const selectedMoves = legalMoves.filter((move) => move.from === selected);
  const targetSquares = new Set(selectedMoves.map((move) => move.to));
  const lastSquares = new Set(lastMove ? [lastMove.uci.slice(0, 2), lastMove.uci.slice(2, 4)] : []);

  useEffect(() => setSelected(null), [fen]);

  function clickSquare(square) {
    if (!canMove) return;
    const destinationMoves = selectedMoves.filter((move) => move.to === square);
    if (destinationMoves.length > 0) {
      const isPromotion = destinationMoves.some((move) => move.promotion);
      if (isPromotion) onPromotion(selected, square);
      else onMove(selected, square);
      setSelected(null);
      return;
    }
    const piece = pieces[square];
    setSelected(piece?.color === orientation ? square : null);
  }

  return (
    <div className="chess-board" role="grid" aria-label={`Chess board from ${orientation}'s side`}>
      {boardRanks.flatMap((rank, rankIndex) => boardFiles.map((file, fileIndex) => {
        const square = `${file}${rank}`;
        const piece = pieces[square];
        const classes = ["board-square"];
        if ((files.indexOf(file) + rank) % 2 !== 0) classes.push("dark");
        if (selected === square) classes.push("selected");
        if (targetSquares.has(square)) classes.push(piece ? "capture-target" : "move-target");
        if (lastSquares.has(square)) classes.push("last-move");
        return (
          <button
            className={classes.join(" ")}
            key={square}
            onClick={() => clickSquare(square)}
            type="button"
            aria-label={`${square}${piece ? `, ${piece.color} piece` : ""}`}
          >
            {fileIndex === 0 && <span className="rank-label">{rank}</span>}
            {rankIndex === 7 && <span className="file-label">{file}</span>}
            {piece && <ChessPiece type={piece.type} color={piece.color} />}
          </button>
        );
      }))}
    </div>
  );
}
