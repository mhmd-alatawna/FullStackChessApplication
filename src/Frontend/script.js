let boardArray = [];
let selectedPieceIndex = null;
let allowedMoves = [];
let turnPlayed = false;
const boardElement = document.getElementById("board");
const messageElement = document.getElementById("message");

const pieceIcons = {
    white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙"
    },
    black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟"
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    await loadGameState();
    renderBoard();
});

async function loadGameState() {
    try {
        const response = await fetch("http://localhost:3000/games");
        const result  = await response.json();

        boardArray = result.data.gameState;

        if (!Array.isArray(boardArray) || boardArray.length !== 32) {
            throw new Error("Invalid gameState received from server");
        }

    } catch (error) {
        console.error("Failed to load game state:", error);
        messageElement.textContent = "Failed to load game state from server.";
    }
}

function renderBoard() {
    boardElement.innerHTML = "";

    for (let row = 8; row >= 1; row--) {
        for (let col = 0; col < 8; col++) {
            const file = String.fromCharCode(97 + col);
            const position = file + row;

            const square = document.createElement("div");
            square.classList.add("square");

            const isLight = (row + col) % 2 === 0;
            square.classList.add(isLight ? "light" : "dark");

            square.dataset.position = position;

            const pieceIndex = findPieceIndexByPosition(position);

            if (pieceIndex !== -1) {
                const piece = boardArray[pieceIndex];
                const pieceType = piece[0];
                const color = piece[1];

                square.textContent = pieceIcons[color][pieceType];

                square.addEventListener("click", () => {
                    handlePieceClick(pieceIndex);
                });
            } else {
                square.addEventListener("click", () => {
                    handleSquareClick(position);
                });
            }

            if (allowedMoves.includes(position)) {
                const dot = document.createElement("div");
                dot.classList.add("move-dot");
                square.appendChild(dot);

                square.addEventListener("click", () => {
                    moveSelectedPiece(position);
                });
            }

            boardElement.appendChild(square);
        }
    }
}

function handlePieceClick(pieceIndex) {
    if (turnPlayed) {
        messageElement.textContent = "Only one move is allowed for now.";
        return;
    }

    const piece = boardArray[pieceIndex];
    const color = piece[1];

    if (color !== "white") {
        messageElement.textContent = "For now, you can only move white pieces.";
        return;
    }

    selectedPieceIndex = pieceIndex;
    allowedMoves = calculateBasicMoves(piece);

    messageElement.textContent = "Choose where to move.";
    renderBoard();
}

function handleSquareClick(position) {
    if (allowedMoves.includes(position)) {
        moveSelectedPiece(position);
    }
}

function moveSelectedPiece(newPosition) {
    if (selectedPieceIndex === null || turnPlayed) {
        return;
    }

    boardArray[selectedPieceIndex][2] = newPosition;

    selectedPieceIndex = null;
    allowedMoves = [];
    turnPlayed = true;

    messageElement.textContent = "Move completed. One turn was played.";
    renderBoard();
}

function findPieceIndexByPosition(position) {
    return boardArray.findIndex(piece => {
        return piece[2] === position && piece[3] === true;
    });
}

function calculateBasicMoves(piece) {
    const pieceType = piece[0];
    const color = piece[1];
    const position = piece[2];

    const file = position[0];
    const rank = parseInt(position[1]);

    const fileIndex = file.charCodeAt(0) - 97;
    const moves = [];

    if (pieceType === "pawn") {
        const direction = color === "white" ? 1 : -1;
        const startRank = color === "white" ? 2 : 7;

        const oneStepRank = rank + direction;
        const oneStepPos = file + oneStepRank;

        if (isInsideBoard(fileIndex, oneStepRank) && !isPositionOccupied(oneStepPos)) {
            moves.push(oneStepPos);

            const twoStepRank = rank + direction * 2;
            const twoStepPos = file + twoStepRank;

            if (rank === startRank && isInsideBoard(fileIndex, twoStepRank) && !isPositionOccupied(twoStepPos)) {
                moves.push(twoStepPos);
            }
        }
    }

    if (pieceType === "knight") {
        const knightMoves = [
            [1, 2], [2, 1], [-1, 2], [-2, 1],
            [1, -2], [2, -1], [-1, -2], [-2, -1]
        ];

        knightMoves.forEach(move => {
            const newFileIndex = fileIndex + move[0];
            const newRank = rank + move[1];

            if (isInsideBoard(newFileIndex, newRank)) {
                moves.push(indexToFile(newFileIndex) + newRank);
            }
        });
    }

    if (pieceType === "king") {
        const kingMoves = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

        kingMoves.forEach(move => {
            const newFileIndex = fileIndex + move[0];
            const newRank = rank + move[1];

            if (isInsideBoard(newFileIndex, newRank)) {
                moves.push(indexToFile(newFileIndex) + newRank);
            }
        });
    }

    return moves;
}

function isOccupiedBySameColor(pos, color) {
    return boardArray.some(p => p[2] === pos && p[1] === color && p[3]);
}

function isInsideBoard(fileIndex, rank) {
    return fileIndex >= 0 && fileIndex < 8 && rank >= 1 && rank <= 8;
}

function isPositionOccupied(pos) {
    return boardArray.some(piece => piece[2] === pos && piece[3] === true);
}

function indexToFile(index) {
    return String.fromCharCode(97 + index);
}