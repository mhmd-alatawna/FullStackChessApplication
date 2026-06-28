const AppError = require("../AppError");
const { USER_ROLES } = require("../domain/User");

const OPERATIONS = Object.freeze({
  USER_CREATE: "user:create",
  USER_READ_SELF: "user:read:self",
  USER_READ_ANY: "user:read:any",
  USER_UPDATE_SELF: "user:update:self",
  USER_UPDATE_ANY: "user:update:any",
  USER_CHANGE_ROLE: "user:change-role",
  USER_DELETE: "user:delete",
  GAME_READ_SELF: "game:read:self",
  GAME_READ_ANY: "game:read:any",
  GAME_MOVE: "game:move",
  GAME_RESIGN: "game:resign",
  GAME_DELETE: "game:delete",
  AGENT_READ: "agent:read",
  AGENT_PLAY: "agent:play",
  MATCHING_JOIN: "matching:join",
  MATCHING_CANCEL: "matching:cancel",
});

const ALL_USER_OPERATIONS = [
  OPERATIONS.USER_READ_SELF,
  OPERATIONS.USER_UPDATE_SELF,
  OPERATIONS.GAME_READ_SELF,
  OPERATIONS.GAME_MOVE,
  OPERATIONS.GAME_RESIGN,
  OPERATIONS.AGENT_READ,
  OPERATIONS.AGENT_PLAY,
  OPERATIONS.MATCHING_JOIN,
  OPERATIONS.MATCHING_CANCEL,
];

const ROLE_PERMISSIONS = Object.freeze({
  [USER_ROLES.USER]: Object.freeze([...ALL_USER_OPERATIONS]),
  [USER_ROLES.MANAGER]: Object.freeze([
    ...ALL_USER_OPERATIONS,
    OPERATIONS.USER_CREATE,
    OPERATIONS.USER_READ_ANY,
    OPERATIONS.USER_UPDATE_ANY,
    OPERATIONS.GAME_READ_ANY,
  ]),
  [USER_ROLES.ADMIN]: Object.freeze([
    ...ALL_USER_OPERATIONS,
    OPERATIONS.USER_CREATE,
    OPERATIONS.USER_READ_ANY,
    OPERATIONS.USER_UPDATE_ANY,
    OPERATIONS.USER_CHANGE_ROLE,
    OPERATIONS.USER_DELETE,
    OPERATIONS.GAME_READ_ANY,
    OPERATIONS.GAME_DELETE,
  ]),
});

function hasPermission(user, operation) {
  if (!user || !ROLE_PERMISSIONS[user.role]) {
    return false;
  }
  return ROLE_PERMISSIONS[user.role].includes(operation);
}

function assertPermission(user, operation) {
  if (!hasPermission(user, operation)) {
    throw new AppError(
      "You do not have permission to perform this action",
      403,
      "FORBIDDEN",
      { operation },
    );
  }
}

function canAccessUser(user, requestedUserId, selfOperation, anyOperation) {
  const isSelf = user && user.id === String(requestedUserId);
  if (isSelf && hasPermission(user, selfOperation)) {
    return true;
  }
  return hasPermission(user, anyOperation);
}

function canAccessGame(user, gameData) {
  if (hasPermission(user, OPERATIONS.GAME_READ_ANY)) {
    return true;
  }
  if (!hasPermission(user, OPERATIONS.GAME_READ_SELF)) {
    return false;
  }
  return gameData.whitePlayerId === user.id || gameData.blackPlayerId === user.id;
}

function assertCanAssignRole(actor, role) {
  if (role === USER_ROLES.ADMIN && actor.role !== USER_ROLES.ADMIN) {
    throw new AppError("Only an admin can assign the admin role", 403, "FORBIDDEN", {
      operation: OPERATIONS.USER_CREATE,
    });
  }
}

module.exports = {
  ROLES: USER_ROLES,
  OPERATIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  assertPermission,
  canAccessUser,
  canAccessGame,
  assertCanAssignRole,
};
