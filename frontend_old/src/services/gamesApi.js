// All chess-game API calls go through this module.
// Every function accepts an `auth` object { userId, userRole }
// and injects it as HTTP headers required by the backend_old middleware.

const BASE_URL = "http://localhost:3000/api";

// Builds the four headers the backend_old expects for every authenticated request.
function buildHeaders({ userId, userRole }) {
  return {
    "Content-Type": "application/json",
    "x-user-id": String(userId),
    "x-user-role": userRole,
    "userId": String(userId),
    "userRole": userRole,
  };
}

// Parses the standard { success, data, error } response envelope.
// Throws an Error if success is false so callers can use try/catch.
async function handleResponse(res) {
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Request failed");
  }
  return json.data;
}

// Enters matchmaking queue. duration is the game clock in minutes.
// Returns { gameId, playerColor } on success.
export async function requestMatch(auth, duration = 10) {
  const res = await fetch(`${BASE_URL}/games/new_game`, {
    method: "POST",
    headers: buildHeaders(auth),
    body: JSON.stringify({ userId: auth.userId, duration }),
  });
  return handleResponse(res);
}

// Fetches full game state: board, turn, status, move history, check flag, etc.
export async function getGameState(auth, gameId) {
  const res = await fetch(`${BASE_URL}/games/game/${gameId}`, {
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}

// Submits a move. from/to are algebraic notation strings e.g. "e2", "e4".
export async function makeMove(auth, gameId, from, to) {
  const res = await fetch(`${BASE_URL}/games/move/${gameId}`, {
    method: "PUT",
    headers: buildHeaders(auth),
    body: JSON.stringify({ from, to }),
  });
  return handleResponse(res);
}

// Returns all legal moves for the current player as [{ from, to }, ...].
// Should only be called when it is the player's turn and the game is active.
export async function getLegalMoves(auth, gameId) {
  const res = await fetch(`${BASE_URL}/games/legal_moves/${gameId}`, {
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}

// Admin/manager: fetch all games in the system.
export async function getAllGames(auth) {
  const res = await fetch(`${BASE_URL}/games/`, {
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}

// Admin only: delete a game by ID.
export async function deleteGame(auth, gameId) {
  const res = await fetch(`${BASE_URL}/games/game/${gameId}`, {
    method: "DELETE",
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}
