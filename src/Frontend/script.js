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
        const data = await response.json();

        if (data.arr && data.arr.length === 32) {
            boardArray = data.arr;
        } else {
            boardArray = createInitialBoardArray();
        }
    } catch (error) {
        console.error("Failed to fetch game state:", error);
        boardArray = createInitialBoardArray();
    }
}

function createInitialBoardArray() {
    return [
        ["rook", "white", "a1", true],
        ["knight", "white", "b1", true],
        ["bishop", "white", "c1", true],
        ["queen", "white", "d1", true],
        ["king", "white", "e1", true],
        ["bishop", "white", "f1", true],
        ["knight", "white", "g1", true],
        ["rook", "white", "h1", true],

        ["pawn", "white", "a2", true],
        ["pawn", "white", "b2", true],
        ["pawn", "white", "c2", true],
        ["pawn", "white", "d2", true],
        ["pawn", "white", "e2", true],
        ["pawn", "white", "f2", true],
        ["pawn", "white", "g2", true],
        ["pawn", "white", "h2", true],

        ["rook", "black", "a8", true],
        ["knight", "black", "b8", true],
        ["bishop", "black", "c8", true],
        ["queen", "black", "d8", true],
        ["king", "black", "e8", true],
        ["bishop", "black", "f8", true],
        ["knight", "black", "g8", true],
        ["rook", "black", "h8", true],

        ["pawn", "black", "a7", true],
        ["pawn", "black", "b7", true],
        ["pawn", "black", "c7", true],
        ["pawn", "black", "d7", true],
        ["pawn", "black", "e7", true],
        ["pawn", "black", "f7", true],
        ["pawn", "black", "g7", true],
        ["pawn", "black", "h7", true]
    ];
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
        const nextRank = rank + direction;

        if (isInsideBoard(fileIndex, nextRank)) {
            moves.push(file + nextRank);
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

function isInsideBoard(fileIndex, rank) {
    return fileIndex >= 0 && fileIndex < 8 && rank >= 1 && rank <= 8;
}

function indexToFile(index) {
    return String.fromCharCode(97 + index);
}