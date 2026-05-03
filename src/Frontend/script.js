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

    setInterval(async () => {
        if (selectedPieceIndex !== null) return;

        await loadGameState();
        renderBoard();
    }, 1000);
});

async function loadGameState() {
    try {
        const gameResponse = await fetch("https://nasty-phones-rule.loca.lt/games");
        const gameResult = await gameResponse.json();

        boardArray = gameResult.game_state;

        const movesResponse = await fetch("https://nasty-phones-rule.loca.lt/games/legal_moves");
        const movesResult = await movesResponse.json();

        legalMoves = movesResult.legal_moves || [];

        if (!Array.isArray(boardArray) || boardArray.length !== 32) {
            throw new Error("Invalid game_state received from server");
        }

        if (!Array.isArray(legalMoves)) {
            legalMoves = [];
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
        const response = await fetch("https://nasty-phones-rule.loca.lt/games/move", {
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

        if (result.state && result.state.game_state) {
            boardArray = result.state.game_state;
        } else {
            throw new Error("Invalid move response from server");
        }

        await loadLegalMoves();

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

async function loadLegalMoves() {
    const movesResponse = await fetch("https://nasty-phones-rule.loca.lt/games/legal_moves");
    const movesResult = await movesResponse.json();
    legalMoves = movesResult.legal_moves || [];
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