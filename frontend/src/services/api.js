import config from "../config";

class ApiClient {
  constructor() {
    localStorage.removeItem("chess_token");
    this.token = sessionStorage.getItem("chess_tab_token") || "";
  }

  setToken(token) {
    this.token = token || "";
    if (this.token)
      sessionStorage.setItem("chess_tab_token", this.token);
    else
      sessionStorage.removeItem("chess_tab_token");
  }

  async request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (this.token)
      headers.Authorization = `Bearer ${this.token}`;

    let response;
    try {
      response = await fetch(`${config.apiUrl}${path}`, { ...options, headers });
    } catch (networkError) {
      throw this.error(
        "NETWORK_ERROR",
        `The backend is not reachable at ${config.apiUrl}.`,
        { cause: networkError.message },
      );
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw this.error("INVALID_RESPONSE", "The backend returned an invalid response.");
    }

    if (!response.ok || !result.success) {
      throw this.error(
        result.error?.code || "REQUEST_FAILED",
        result.error?.message || "The request failed.",
        result.error?.details,
      );
    }
    return result.data;
  }

  error(code, message, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.details = details || {};
    return error;
  }

  get(path) { return this.request(path); }
  post(path, data) { return this.request(path, { method: "POST", body: JSON.stringify(data) }); }
  put(path, data) { return this.request(path, { method: "PUT", body: JSON.stringify(data) }); }

  login(email, password) { return this.post("/auth/login", { email, password }); }

  signup(firstName, lastName, email, password) { return this.post("/auth/signup", { firstName, lastName, email, password }); }

  logout() { return this.post("/auth/logout", {}); }
  getMe() { return this.get("/users/me"); }
  updateMe(profile) { return this.put("/users/me", profile); }
  getSettings() { return this.get("/settings"); }
  updateSettings(settings) { return this.put("/settings", settings); }
  getUsers() { return this.get("/users"); }
  createUser(user) { return this.post("/users", user); }
  updateUser(id, profile) { return this.put(`/users/${encodeURIComponent(id)}`, profile); }
  changeRole(id, role) { return this.put(`/users/${encodeURIComponent(id)}/role`, { role }); }
  deleteUser(id) { return this.request(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  getAgents() { return this.get("/agents"); }
  getMyGames() { return this.get("/games/my"); }
  getAllGames() { return this.get("/games"); }
  getGame(id) { return this.get(`/games/${encodeURIComponent(id)}`); }
  deleteGame(id) { return this.request(`/games/${encodeURIComponent(id)}`, { method: "DELETE" }); }
}

export default new ApiClient();
