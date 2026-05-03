let boardArray = [];
let legalMoves = [];
let selectedPieceIndex = null;
let selectedFrom = null;
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

        boardArray = result.game_state;

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
    const position = piece[2];

    if (color !== "white") {
        messageElement.textContent = "For now, you can only move white pieces.";
        return;
    }

    selectedPieceIndex = pieceIndex;
    selectedFrom = position;

    allowedMoves = legalMoves
        .filter(move => move.from === position)
        .map(move => move.to);

    if (allowedMoves.length === 0) {
        messageElement.textContent = "No legal moves for this piece.";
    } else {
        messageElement.textContent = "Choose where to move.";
    }

    renderBoard();
}

function handleSquareClick(position) {
    if (allowedMoves.includes(position)) {
        moveSelectedPiece(position);
    }
}

async function moveSelectedPiece(newPosition) {
    if (selectedPieceIndex === null || selectedFrom === null || turnPlayed) {
        return;
    }

    const moveRequest = {
        from: selectedFrom,
        to: newPosition
    };

    try {
        const response = await fetch("http://localhost:3000/games/move", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(moveRequest)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || "Move failed");
        }

        if (result.game_state) {
            boardArray = result.game_state;
        } else {
            boardArray[selectedPieceIndex][2] = newPosition;
        }

        legalMoves = result.moves || result.legal_moves || legalMoves;

        selectedPieceIndex = null;
        selectedFrom = null;
        allowedMoves = [];
        turnPlayed = true;

        messageElement.textContent = "Move completed. One turn was played.";
        renderBoard();

    } catch (error) {
        console.error("Failed to send move:", error);
        messageElement.textContent = "Move failed.";
    }
}


function findPieceIndexByPosition(position) {
    return boardArray.findIndex(piece => {
        return piece[2] === position && piece[3] === true;
    });
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