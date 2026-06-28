const AppError = require("../src/AppError");

const USER_ROLES = Object.freeze({
  USER: "user",
  MANAGER: "manager",
  ADMIN: "admin",
});

const GAME_RESULTS = Object.freeze({
  WIN: "win",
  LOSS: "loss",
  DRAW: "draw",
});

class User {
  constructor(userData) {
    if (!userData || typeof userData !== "object") {
      throw new AppError("User data is required", 400, "USER_DATA_REQUIRED");
    }

    this._data = {
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email ?? null,
      theme: userData.theme ?? "dark",
      password: userData.password,
      role: userData.role ?? USER_ROLES.USER,
      isAutomated: userData.isAutomated ?? false,
      wins: userData.wins ?? 0,
      losses: userData.losses ?? 0,
      draws: userData.draws ?? 0,
      elo: userData.elo ?? 1200,
    };

    this._validate();
  }

  _validate() {
    if (this._data.id === undefined || this._data.id === null || this._data.id === "") {
      throw new AppError("A user id is required", 400, "USER_ID_REQUIRED");
    }

    if (!this._data.firstName || !this._data.lastName) {
      throw new AppError("First and last name are required", 400, "USER_NAME_REQUIRED");
    }

    if (!this._data.isAutomated && this._data.email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this._data.email)) {
      throw new AppError("The email address is invalid", 400, "INVALID_EMAIL");
    }
    if (!["dark", "light"].includes(this._data.theme)) {
      throw new AppError("The theme must be dark or light", 400, "INVALID_THEME");
    }

    if (typeof this._data.password !== "string" || this._data.password.length === 0) {
      throw new AppError("A password is required", 400, "PASSWORD_REQUIRED");
    }

    if (!Object.values(USER_ROLES).includes(this._data.role)) {
      throw new AppError("The user role is invalid", 400, "INVALID_USER_ROLE", {
        role: this._data.role,
      });
    }

    if (typeof this._data.isAutomated !== "boolean") {
      throw new AppError("Automated user status must be a boolean", 400, "INVALID_USER_TYPE");
    }

    const stats = [this._data.wins, this._data.losses, this._data.draws, this._data.elo];
    const invalidStat = stats.some((value) => !Number.isFinite(value) || value < 0);
    if (invalidStat) {
      throw new AppError("User statistics must be non-negative numbers", 400, "INVALID_USER_STATS");
    }
  }

  getId() {
    return this._data.id;
  }

  getRole() {
    return this._data.role;
  }

  getElo() {
    return this._data.elo;
  }

  isAutomated() {
    return this._data.isAutomated;
  }

  checkPassword(password) {
    if (this._data.isAutomated) {
      return false;
    }
    return this._data.password === password;
  }

  updateProfile(profile) {
    if (!profile || typeof profile !== "object") {
      throw new AppError("Profile data is required", 400, "USER_PROFILE_REQUIRED");
    }

    const firstName = profile.firstName ?? this._data.firstName;
    const lastName = profile.lastName ?? this._data.lastName;
    let email = profile.email
    let theme = profile.theme
    let password = profile.password
    if (password === undefined || password === null || password === "")
      password = this._data.password;
    if (theme === undefined || theme === null || theme === "")
      theme = this._data.theme;
    if (email !== undefined && email !== null && email === "")
      email = String(profile.email).trim().toLowerCase();


    if (!firstName || !lastName) {
      throw new AppError("First and last name are required", 400, "USER_NAME_REQUIRED");
    }
    if (typeof password !== "string" || password.length === 0) {
      throw new AppError("A password is required", 400, "PASSWORD_REQUIRED");
    }
    if (profile.email !== undefined && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new AppError("A valid email address is required", 400, "INVALID_EMAIL");
    }
    if (!["dark", "light"].includes(theme)) {
      throw new AppError("The theme must be dark or light", 400, "INVALID_THEME");
    }

    this._data.firstName = firstName;
    this._data.lastName = lastName;
    this._data.password = password;
    this._data.email = email;
    this._data.theme = theme;
  }

  changeRole(role) {
    if (!Object.values(USER_ROLES).includes(role)) {
      throw new AppError("The user role is invalid", 400, "INVALID_USER_ROLE", { role });
    }
    this._data.role = role;
  }

  recordGameResult(result, eloChange) {
    if (!Object.values(GAME_RESULTS).includes(result)) {
      throw new AppError("The game result is invalid", 400, "INVALID_GAME_RESULT", { result });
    }
    if (!Number.isInteger(eloChange)) {
      throw new AppError("The Elo change must be an integer", 400, "INVALID_ELO_CHANGE");
    }

    if (result === GAME_RESULTS.WIN) {
      this._data.wins += 1;
    } else if (result === GAME_RESULTS.LOSS) {
      this._data.losses += 1;
    } else {
      this._data.draws += 1;
    }

    this._data.elo += eloChange;
    if (this._data.elo < 0) {
      this._data.elo = 0;
    }
  }

  getData(includePassword = false) {
    const data = {
      id: this._data.id,
      firstName: this._data.firstName,
      lastName: this._data.lastName,
      email: this._data.email,
      theme: this._data.theme,
      role: this._data.role,
      isAutomated: this._data.isAutomated,
      wins: this._data.wins,
      losses: this._data.losses,
      draws: this._data.draws,
      elo: this._data.elo,
    };

    if (includePassword) {
      data.password = this._data.password;
    }
    return data;
  }

  static calculateEloChanges(firstElo, secondElo, firstPlayerScore) {
    const validScores = [0, 0.5, 1];
    if (!validScores.includes(firstPlayerScore)) {
      throw new AppError("The Elo score must be 0, 0.5, or 1", 400, "INVALID_ELO_SCORE");
    }

    const expectedScore = 1 / (1 + Math.pow(10, (secondElo - firstElo) / 400));
    const firstPlayerChange = Math.round(32 * (firstPlayerScore - expectedScore));

    return {
      firstPlayerChange,
      secondPlayerChange: -firstPlayerChange,
    };
  }
}

module.exports = { User, USER_ROLES, GAME_RESULTS };
