const AppError = require("../AppError");
const { User, USER_ROLES } = require("../models/User");

class UsersUseCases {
  constructor(dataAccess) {
    this.users = dataAccess.users;
    this.ids = dataAccess.ids;
  }

  async createUser(userData) {
    if (!userData || typeof userData !== "object") {
      throw new AppError("User data is required", 400, "USER_DATA_REQUIRED");
    }

    if (userData.email && await this.users.findByEmail(userData.email)) {
      throw new AppError("The email address is already used", 409, "EMAIL_ALREADY_USED");
    }
    const id = await this.ids.next();
    const user = new User({
      id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email ? String(userData.email).trim().toLowerCase() : null,
      theme: userData.theme ?? "dark",
      password: userData.password,
      role: userData.role ?? USER_ROLES.USER,
    });
    const created = await this.users.create(user);

    if (!created) {
      throw new AppError("The user already exists", 409, "USER_ALREADY_EXISTS", { userId: id });
    }
    return user.getData();
  }

  async getUser(userId) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError("The user was not found", 404, "USER_NOT_FOUND", { userId });
    }
    return user.getData();
  }

  async getAllUsers() {
    const users = await this.users.findAll();
    return users.map((user) => user.getData());
  }

  async updateProfile(userId, profile) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError("The user was not found", 404, "USER_NOT_FOUND", { userId });
    }

    if (profile.email) {
      const emailOwner = await this.users.findByEmail(profile.email);
      if (emailOwner && emailOwner.getId() !== user.getId()) {
        throw new AppError("The email address is already used", 409, "EMAIL_ALREADY_USED");
      }
    }
    user.updateProfile(profile);
    await this.users.update(user);
    return user.getData();
  }

  async changeRole(userId, role) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError("The user was not found", 404, "USER_NOT_FOUND", { userId });
    }

    const currentRole = user.getRole();
    const changesAdminTable = currentRole === USER_ROLES.ADMIN || role === USER_ROLES.ADMIN;
    if (changesAdminTable && currentRole !== role) {
      throw new AppError(
        "Accounts cannot transition between normal-user and admin tables",
        400,
        "INVALID_ROLE_TRANSITION",
        { currentRole, requestedRole: role },
      );
    }

    user.changeRole(role);
    await this.users.update(user);
    return user.getData();
  }

  async deleteUser(userId) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError("The user was not found", 404, "USER_NOT_FOUND", { userId });
    }

    const deleted = await this.users.delete(userId);
    if (!deleted) {
      throw new AppError("The user was not found", 404, "USER_NOT_FOUND", { userId });
    }
    return user.getData();
  }
}

module.exports = UsersUseCases;
