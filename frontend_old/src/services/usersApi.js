// All user-related API calls go through this module.
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

// Validates that the user exists and the role matches.
// Returns the full user object on success.
export async function login(userId, userRole) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, userRole }),
  });
  return handleResponse(res);
}

// Stateless logout — backend_old simply returns { success: true }.
// The frontend clears the context regardless.
export async function logout(auth) {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}

// Returns the profile of the currently logged-in user (identified by x-user-id header).
export async function getMe(auth) {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}

// Admin/manager: fetch all users.
export async function getAllUsers(auth) {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}

// Fetch a single user by numeric ID.
export async function getUserById(auth, id) {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}

// Update a user's firstName, lastName, or userRole.
export async function updateUser(auth, id, data) {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: "PUT",
    headers: buildHeaders(auth),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// Fetch the logged-in user's editable settings (maps to GET /settings on the backend_old).
export async function getSettings(auth) {
  const res = await fetch(`${BASE_URL}/settings`, {
    headers: buildHeaders(auth),
  });
  return handleResponse(res);
}

// Persist updated settings for the logged-in user (maps to PUT /settings).
export async function updateSettings(auth, data) {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: "PUT",
    headers: buildHeaders(auth),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
