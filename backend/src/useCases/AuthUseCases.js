const { randomUUID } = require("node:crypto");
const AppError = require("../AppError");

class AuthUseCases {
  constructor(dataAccess) {
    this.users = dataAccess.users;
    this.sessions = dataAccess.sessions;
  }

  async login(credentials) {
    if (!credentials || typeof credentials !== "object") {
      throw new AppError("Login credentials are required", 400, "VALIDATION_ERROR");
    }

    let candidates = [];
    if (credentials.userId) {
      const user = await this.users.findById(credentials.userId);
      if (user) {
        candidates = [user];
      }
    } else if (credentials.email) {
      const user = await this.users.findByEmail(credentials.email);
      if (user) candidates = [user];
    } else if (credentials.firstName && credentials.lastName) {
      candidates = await this.users.findByName(credentials.firstName, credentials.lastName);
    }

    const matchingUsers = candidates.filter((user) => user.checkPassword(credentials.password));
    if (matchingUsers.length !== 1) {
      throw new AppError("The email, name, or password is incorrect", 401, "INVALID_CREDENTIALS");
    }
    const user = matchingUsers[0];

    const token = randomUUID();
    await this.sessions.create(token, user.getId());

    return {
      token,
      user: user.getData(),
    };
  }

  async logout(token) {
    await this.sessions.delete(token);
    return true;
  }

  async getAuthenticatedUser(token) {
    const userId = await this.sessions.findUserId(token);
    if (!userId) {
      throw new AppError("The authentication token is invalid", 401, "UNAUTHENTICATED");
    }

    const user = await this.users.findById(userId);
    if (!user) {
      await this.sessions.delete(token);
      throw new AppError("The authenticated user no longer exists", 401, "UNAUTHENTICATED");
    }
    return user.getData();
  }
}

module.exports = AuthUseCases;
