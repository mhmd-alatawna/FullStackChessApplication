const server_url = "http://localhost:3000";

const userRole = "user";
const gameDuration = "10:00";

function getUserId() {
    return document.getElementById("user-id").value;
}

let currentGameId = null;
let playerColor = null;
let currentTurn = null;

let boardArray = [];
let legalMoves = [];
let selectedPieceIndex = null;
let selectedFrom = null;
let allowedMoves = [];

const boardElement = document.getElementById("board");
const messageElement = document.getElementById("message");

const startGameBtn = document.getElementById("start-game-btn");
const gameIdElement = document.getElementById("game-id");
const playerColorElement = document.getElementById("player-color");
const currentTurnElement = document.getElementById("current-turn");

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

document.addEventListener("DOMContentLoaded", () => {
    renderBoard();

    startGameBtn.addEventListener("click", async () => {
        await startGame();
    });

    setInterval(async () => {
        if (!currentGameId) return;
        if (selectedPieceIndex !== null) return;

        await loadGameState();
        await loadLegalMoves();
        renderBoard();
    }, 1000);
});

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "x-user-role": userRole,
        "x-user-id": getUserId()
    };
}

async function startGame() {
    try {
        messageElement.textContent = "Requesting a game...";

        const response = await fetch(`${server_url}/games/new_game`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                userId: getUserId(),
                duration: gameDuration
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || "Failed to start game");
        }

        const data = result.data || result;

        currentGameId = data.gameId;
        playerColor = data.playerColor || "white";

        gameIdElement.textContent = currentGameId;
        playerColorElement.textContent = playerColor;

        messageElement.textContent = `Game created. You are ${playerColor}. Waiting for game state...`;

        await loadGameState();
        await loadLegalMoves();
        renderBoard();

    } catch (error) {
        console.error("Failed to start game:", error);
        messageElement.textContent = "Failed to start game.";
    }
}

async function loadGameState() {
    if (!currentGameId) return;

    try {
        const response = await fetch(`${server_url}/games/game/${currentGameId}`, {
            method: "GET",
            headers: getHeaders()
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || "Failed to load game state");
        }

        const data = result.data || result;

        boardArray = data.game_state || data.gameState || [];
        currentTurn = data.current_turn || data.currentTurn || currentTurn;

        currentTurnElement.textContent = currentTurn || "Unknown";

        if (!Array.isArray(boardArray)) {
            boardArray = [];
        }

    } catch (error) {
        console.error("Failed to load game state:", error);
        messageElement.textContent = "Failed to load game state.";
    }
}

async function loadLegalMoves() {
    if (!currentGameId) return;

    try {
        const response = await fetch(`${server_url}/games/${currentGameId}/legal_moves`, {
            method: "GET",
            headers: getHeaders()
        });

        const result = await response.json();

        if (!response.ok) {
            legalMoves = [];
            return;
        }

        const data = result.data || result;

        legalMoves = data.legal_moves || data.legalMoves || [];

        if (!Array.isArray(legalMoves)) {
            legalMoves = [];
        }

    } catch (error) {
        console.error("Failed to load legal moves:", error);
        legalMoves = [];
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

                square.textContent = pieceIcons[color]?.[pieceType] || "?";

                if (pieceIndex === selectedPieceIndex) {
                    square.classList.add("selected");
                }

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
    if (!currentGameId) {
        messageElement.textContent = "Start a game first.";
        return;
    }

    const piece = boardArray[pieceIndex];
    const color = piece[1];
    const position = piece[2];

    if (playerColor && color !== playerColor) {
        messageElement.textContent = `You can only move ${playerColor} pieces.`;
        return;
    }

    if (currentTurn && color !== currentTurn) {
        messageElement.textContent = `It is ${currentTurn}'s turn.`;
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
        messageElement.textContent = `Selected ${position}. Choose where to move.`;
    }

    renderBoard();
}

function handleSquareClick(position) {
    if (allowedMoves.includes(position)) {
        moveSelectedPiece(position);
    } else {
        selectedPieceIndex = null;
        selectedFrom = null;
        allowedMoves = [];
        renderBoard();
    }
}

async function moveSelectedPiece(newPosition) {
    if (selectedPieceIndex === null || selectedFrom === null || !currentGameId) {
        return;
    }

    const moveRequest = {
        from: selectedFrom,
        to: newPosition
    };

    try {
        const response = await fetch(`${server_url}/games/move/${currentGameId}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(moveRequest)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || "Move failed");
        }

        selectedPieceIndex = null;
        selectedFrom = null;
        allowedMoves = [];

        messageElement.textContent = `Move sent: ${moveRequest.from} → ${moveRequest.to}`;

        await loadGameState();
        await loadLegalMoves();
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