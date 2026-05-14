const server_url = "http://localhost:3000";

// In a real app, this would come from a login token or session
const userRole = "user";
function getUserId() {
    // 1. Try to grab the ID from URL parameters (Standard method for passing state between pages)
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('userId');
    if (userIdFromUrl) return userIdFromUrl;

    // 2. Fallback to session storage
    const storedId = sessionStorage.getItem("chessUserId");
    if (storedId) return storedId;

    // 3. Last resort default to prevent NaN errors
    return null;
}

let currentGameId = null;
let playerColor = null;
let currentTurn = null;
let currentStatus = null; // Track the game status
let pollingInterval = null; // Store the interval ID
let isCheck = { white: false, black: false };
let winner = null;

let boardArray = [];
let moveHistory = []; // Store history
let legalMoves = [];
let selectedPieceIndex = null;
let selectedFrom = null;
let allowedMoves = [];

// DOM Elements (Make sure you add these to your HTML!)
const boardElement = document.getElementById("board");
const messageElement = document.getElementById("message");
const gameIdElement = document.getElementById("game-id");
const playerColorElement = document.getElementById("player-color");
const currentTurnElement = document.getElementById("current-turn");
const popupElement = document.getElementById("matchmaking-popup"); // Add a popup div
const moveHistoryElement = document.getElementById("move-history"); // Add a ul/div
const capturedWhiteElement = document.getElementById("captured-white"); // Add a div
const capturedBlackElement = document.getElementById("captured-black"); // Add a div

const pieceIcons = {
    white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
    black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" }
};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Extract gameId from the URL (e.g., game.html?id=42)
    const urlParams = new URLSearchParams(window.location.search);
    currentGameId = urlParams.get('id');

    if (!currentGameId) {
        messageElement.textContent = "No game ID provided in URL. Go back to Home.";
        return;
    }

    gameIdElement.textContent = currentGameId;

    // 2. Initial Load
    await loadGameState();
    if (currentStatus !== 'finished' && currentTurn === playerColor) {
        await loadLegalMoves();
    }
    updateUI();

    // 3. Start Polling Loop
    startPolling();

    // 4. Home Button Listener
    const homeBtn = document.getElementById("home-btn");
    if (homeBtn) {
        homeBtn.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }
});

function getHeaders() {
    const userId = getUserId();
    return {
        "Content-Type": "application/json",
        "x-user-role": userRole,
        "x-user-id": userId,
        "userRole": userRole,
        "userId": userId
    };
}

function startPolling() {
    // Save the interval to the variable so we can clear it later
    pollingInterval = setInterval(async () => {
        if (!currentGameId) return;

        // Don't interrupt the user if they are mid-click
        if (selectedPieceIndex !== null) return;

        await loadGameState();

        // If the game ended, stop the loop entirely
        if (currentStatus === 'finished') {
            clearInterval(pollingInterval);
            updateUI();
            return;
        }

        if (currentStatus === 'active' && currentTurn === playerColor) {
            await loadLegalMoves();
        }

        updateUI();
    }, 300);
}

async function loadGameState() {
    try {
        const response = await fetch(`${server_url}/games/game/${currentGameId}`, {
            method: "GET",
            headers: getHeaders()
        });

        const result = await response.json();

        if (!response.ok || !result.success) throw new Error(result.error?.message || "Failed to load game state");

        const data = result.data;

        boardArray = data.game_state || [];
        currentTurn = data.current_turn || currentTurn;
        currentStatus = data.status; // Get the status
        moveHistory = data.move_history || []; // Get the history
        isCheck = data.isCheck || { white: false, black: false };
        winner = data.winner;

        const currentUserId = Number(getUserId());
        if (data.white_player_id === currentUserId) playerColor = 'white';
        else if (data.black_player_id === currentUserId) playerColor = 'black';
        else playerColor = 'spectator';

        // If game is over, get winner
        if (currentStatus === 'finished') {
            messageElement.textContent = `Game Over! Winner: ${data.winner}`;
        }

    } catch (error) {
        console.error("Failed to load game state:", error);
    }
}

async function loadLegalMoves() {
    if (!currentGameId || currentStatus === 'finished' || currentTurn !== playerColor) {
        legalMoves = [];
        return;
    }

    try {
        const response = await fetch(`${server_url}/games/legal_moves/${currentGameId}`, {
            method: "GET",
            headers: getHeaders()
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            legalMoves = [];
            return;
        }

        legalMoves = result.data.legal_moves || [];

    } catch (error) {
        console.error("Failed to load legal moves:", error);
        legalMoves = [];
    }
}

function findPieceIndexByPosition(position) {
    return boardArray.findIndex(p => p[2] === position && p[3] === true);
}

function handleSquareClick(position) {
    // Clear selection if we didn't click a move
    selectedPieceIndex = null;
    selectedFrom = null;
    allowedMoves = [];
    renderBoard();
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

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || "Move failed");
        }

        selectedPieceIndex = null;
        selectedFrom = null;
        allowedMoves = [];

        messageElement.textContent = `Move sent: ${moveRequest.from} → ${moveRequest.to}`;

        await loadGameState();
        if (currentTurn === playerColor) {
            await loadLegalMoves();
        }
        renderBoard();

    } catch (error) {
        console.error("Failed to send move:", error);
        messageElement.textContent = "Move failed.";
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


// --- NEW UI ORCHESTRATOR ---
function updateUI() {
    renderBoard();
    renderMoveHistory();
    renderCapturedPieces();

    currentTurnElement.textContent = currentTurn || "Unknown";
    playerColorElement.textContent = playerColor || "Spectator";

    // Handle Game Over Popup
    const overlay = document.getElementById("game-over-overlay");
    const gameOverPopup = document.getElementById("game-over-popup");
    const winnerText = document.getElementById("winner-text");
    const detailsText = document.getElementById("game-over-details");

    if (currentStatus === 'finished') {
        if (overlay) overlay.style.display = 'block';
        if (gameOverPopup) gameOverPopup.style.display = 'block';

        if (winnerText) {
            if (winner === 'draw') {
                winnerText.textContent = "It's a Draw!";
            } else if (winner) {
                winnerText.textContent = `${winner.charAt(0).toUpperCase() + winner.slice(1)} Wins!`;
            } else {
                winnerText.textContent = "Game Over";
            }
        }
        
        if (detailsText) {
            if (winner === 'draw') {
                detailsText.textContent = "Stalemate.";
            } else if (winner) {
                detailsText.textContent = `Checkmate! The ${winner} player has won the game.`;
            }
        }
    } else {
        if (overlay) overlay.style.display = 'none';
        if (gameOverPopup) gameOverPopup.style.display = 'none';
    }

    // Handle Popup visibility based on Status
    if (currentStatus === 'pending') {
        popupElement.style.display = 'block';
        popupElement.textContent = "Looking for opponent... Please wait.";
    } else {
        popupElement.style.display = 'none';
    }
}

function renderMoveHistory() {
    if (!moveHistoryElement) return;
    moveHistoryElement.innerHTML = ""; // Clear old history

    moveHistory.forEach((move, index) => {
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${move.color} moved ${move.piece} from ${move.fromPos} to ${move.toPos}`;
        moveHistoryElement.appendChild(li);
    });
}

function renderCapturedPieces() {
    if (!capturedWhiteElement || !capturedBlackElement) return;

    // Filter pieces where alive (index 3) is false
    const deadPieces = boardArray.filter(piece => piece[3] === false);

    const deadWhite = deadPieces.filter(p => p[1] === 'white').map(p => pieceIcons.white[p[0]]);
    const deadBlack = deadPieces.filter(p => p[1] === 'black').map(p => pieceIcons.black[p[0]]);

    // Display them
    capturedWhiteElement.textContent = `Captured White: ${deadWhite.join(" ")}`;
    capturedBlackElement.textContent = `Captured Black: ${deadBlack.join(" ")}`;
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

                if (pieceType === "king" && isCheck[color]) {
                    square.classList.add("check");
                }
            }

            if (allowedMoves.includes(position)) {
                const dot = document.createElement("div");
                dot.classList.add("move-dot");
                square.appendChild(dot);
            }

            square.addEventListener("click", () => {
                if (allowedMoves.includes(position)) {
                    moveSelectedPiece(position);
                } else if (pieceIndex !== -1) {
                    handlePieceClick(pieceIndex);
                } else {
                    handleSquareClick(position);
                }
            });

            boardElement.appendChild(square);
        }
    }
}
