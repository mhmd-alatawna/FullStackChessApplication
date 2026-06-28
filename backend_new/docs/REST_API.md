# REST API reference

Base URL: `http://localhost:3000/api`

Use `Content-Type: application/json` for JSON bodies. Except for health, signup, and login, every
endpoint requires `Authorization: Bearer <token>`. All responses use the envelope and schemas in
[API_CONTRACT.md](../API_CONTRACT.md), and every response has an `x-request-id` header.

REST owns account/session operations and authoritative reads. Matchmaking and live game mutations
are Socket.IO operations; see [WEBSOCKET_API.md](WEBSOCKET_API.md).

## Endpoint summary

| Method | Path | Access | Success data |
|---|---|---|---|
| `GET` | `/health` | Public | `{ status }` |
| `POST` | `/auth/signup` | Public | `{ token, user }` |
| `POST` | `/auth/login` | Public | `{ token, user }` |
| `POST` | `/auth/logout` | Authenticated | `{ message }` |
| `GET` | `/users` | Manager/admin | User array |
| `POST` | `/users` | Manager/admin | Created user |
| `GET` | `/users/me` | Authenticated | Current user |
| `PUT` | `/users/me` | Authenticated | Updated current user |
| `GET` | `/settings` | Authenticated | Current profile/settings |
| `PUT` | `/settings` | Authenticated | Updated profile/settings |
| `GET` | `/users/:userId` | Self, manager/admin | Requested user |
| `PUT` | `/users/:userId` | Self, manager/admin | Updated user |
| `PUT` | `/users/:userId/role` | Admin | Updated user |
| `DELETE` | `/users/:userId` | Admin | Deleted user |
| `GET` | `/agents` | Authenticated | Enabled agent array |
| `GET` | `/games` | Manager/admin | Game array |
| `GET` | `/games/my` | Authenticated | Participant game array |
| `GET` | `/games/:gameId` | Participant, manager/admin | Game |
| `GET` | `/games/:gameId/legal-moves` | Current participant | Legal move array |
| `DELETE` | `/games/:gameId` | Admin | `{ gameId }` |

## Public and session endpoints

### `GET /health`

Checks that Express is serving requests.

Request: no body or authentication.

Data flow:

1. Request logging assigns a request ID.
2. The route returns directly; it does not read repositories.
3. The response is `200`.

```json
{
  "success": true,
  "data": { "status": "ok" },
  "error": null
}
```

This is a process-health check, not a database dependency check.

### `POST /auth/signup`

Creates a human account and logs it in immediately.

```json
{
  "firstName": "New",
  "lastName": "Player",
  "password": "password"
}
```

Data flow:

1. The route requires non-empty `firstName`, `lastName`, and `password`.
2. `UsersUseCases` asks the data-access ID source for a new ID.
3. `User` validates the identity and defaults the role to `user`, automated status to `false`,
   statistics to zero, and Elo to `1200`.
4. The users repository stores the account.
5. `AuthUseCases.login` verifies the same credentials, creates a token, and stores
   `token -> userId` in the sessions repository.
6. The route returns `201` with `{ token, user }`.

Client-supplied `role`, `isAutomated`, statistics, or Elo are ignored. The response never contains
the password.

Typical failures: `400 VALIDATION_ERROR`, domain validation errors, or
`409 USER_ALREADY_EXISTS` if an injected ID source creates a duplicate.

### `POST /auth/login`

Creates a new session for an existing human user.

```json
{
  "email": "player@chessgrove.local",
  "password": "player123"
}
```

Existing API clients may continue sending a user ID or first/last name with a password. Email is the
primary Assignment 3 frontend login and internal IDs remain hidden from users.

Data flow:

1. The route requires a non-empty password plus email, name, or `userId`.
2. `AuthUseCases` loads the matching email, ID, or name candidate.
3. `User.checkPassword` rejects missing users, wrong passwords, and all automated users. Exactly one
   name/password candidate must match; ambiguous duplicate credentials are rejected.
4. A new opaque token is generated and stored in the sessions repository.
5. The route returns `200` with the new token and safe user data.

```json
{
  "success": true,
  "data": {
    "token": "session-token",
    "user": {
      "id": "3",
      "firstName": "Regular",
      "lastName": "User",
      "email": "player@chessgrove.local",
      "theme": "dark",
      "role": "user",
      "isAutomated": false,
      "wins": 0,
      "losses": 0,
      "draws": 0,
      "elo": 1200
    }
  },
  "error": null
}
```

Each login creates an independent session. Typical failures: `400 VALIDATION_ERROR` and
`401 INVALID_CREDENTIALS`.

### `GET /settings` and `PUT /settings`

Both require bearer authentication. GET returns the current safe User/settings object. PUT requires
`firstName`, `lastName`, `email`, and `theme`; theme is `dark` or `light`. It updates the same Player
profile returned by `/users/me` and never exposes or changes the password.

### `POST /auth/logout`

Revokes the bearer session used for this request.

Request: bearer token; no body.

Data flow:

1. Authentication resolves the token and assigns `req.user` and `req.authToken`.
2. `AuthUseCases.logout` deletes that token from the sessions repository.
3. The WebSocket gateway disconnects every tracked socket using that exact token.
4. Matchmaking removes the user's ticket if the user is currently waiting.
5. The route returns `200`.

```json
{
  "success": true,
  "data": { "message": "Logged out successfully" },
  "error": null
}
```

Logging out does not end an active game and does not revoke the user's other session tokens. A
missing or revoked token fails before the route with `401 UNAUTHENTICATED`.

## User endpoints

All `/users` endpoints authenticate first. Returned users always use the shared safe User schema.

### `GET /users`

Lists all human and automated users. Access: manager/admin.

Data flow:

1. Authentication resolves the session.
2. RBAC requires `user:read:any`.
3. `UsersUseCases.getAllUsers` loads all user entities.
4. Each entity is converted to safe user data.
5. The route returns `200` with an array.

Typical failure: `403 FORBIDDEN` for a normal user.

### `POST /users`

Administratively creates a user. Access: manager/admin.

```json
{
  "firstName": "Managed",
  "lastName": "User",
  "password": "password",
  "role": "user"
}
```

Data flow:

1. Authentication and RBAC require `user:create`.
2. The route requires `firstName`, `lastName`, `password`, and `role`.
3. Role-assignment policy rejects a manager attempting to create an `admin`.
4. `UsersUseCases` obtains an ID, constructs a validated User, and stores it.
5. The route returns `201` with the safe created user.

Managers may create `user` or `manager` accounts. Admins may create any supported role. This endpoint
does not create a session. Client-supplied automated status or statistics are not applied.

Typical failures: `400 VALIDATION_ERROR`, `400 INVALID_USER_ROLE`, `403 FORBIDDEN`, or
`409 USER_ALREADY_EXISTS`.

### `GET /users/me`

Reads the authenticated user. Access: every authenticated role.

Data flow:

1. Authentication derives the user ID from the token; no client user ID is trusted.
2. RBAC requires `user:read:self`.
3. `UsersUseCases.getUser(req.user.id)` loads the latest user entity.
4. The route returns `200` with safe user data.

Typical failures: `401 UNAUTHENTICATED` or `404 USER_NOT_FOUND`.

### `PUT /users/me`

Updates the authenticated profile. Access: every authenticated role.

```json
{
  "firstName": "Updated",
  "lastName": "Player",
  "password": "new-password"
}
```

At least one displayed field must be present; omitted fields keep their current value.

Data flow:

1. Authentication derives the target ID and RBAC requires `user:update:self`.
2. The route rejects bodies without `firstName`, `lastName`, or `password`.
3. `UsersUseCases` loads the entity.
4. `User.updateProfile` applies and validates the partial update.
5. The users repository saves the entity.
6. The route returns `200` with safe updated data.

Role, automated status, statistics, and Elo cannot be changed through this operation.

### `GET /users/:userId`

Reads one user. Access: the same user, manager, or admin.

Data flow:

1. Authentication establishes the actor.
2. Resource authorization allows matching actor/target IDs through `user:read:self`, or requires
   `user:read:any` for a different ID.
3. `UsersUseCases` loads the target.
4. The route returns `200` with safe data.

Typical failures: `403 FORBIDDEN` or `404 USER_NOT_FOUND`.

### `PUT /users/:userId`

Updates a profile. Access: the same user, manager, or admin. The body and update semantics match
`PUT /users/me`.

Data flow:

1. Authentication establishes the actor.
2. Resource authorization requires self-update permission for the same ID or `user:update:any` for
   a different ID.
3. The route validates that at least one profile field is present.
4. The use case loads, mutates, validates, and saves the target User.
5. The route returns the safe updated user.

This route cannot change roles or game statistics.

### `PUT /users/:userId/role`

Changes a normal user's role between `user` and `manager`. Access: admin only.

```json
{ "role": "manager" }
```

Data flow:

1. Authentication and RBAC require `user:change-role`.
2. The route requires `role`.
3. `UsersUseCases` loads the target User.
4. The use case rejects transitions into or out of the separate admin table.
5. `User.changeRole` accepts `user` or `manager` for a normal account.
6. The repository saves the entity and the route returns `200` with updated safe data.

Existing sessions remain active. Because identity is reloaded on each REST request and socket
command, the new role applies to subsequent actions immediately.

### `DELETE /users/:userId`

Deletes a user. Access: admin only.

Data flow:

1. Authentication and RBAC require `user:delete`.
2. `UsersUseCases` loads the target so the response can contain its former safe data.
3. The users repository first verifies that no game-participant rows reference the player.
4. It deletes the parent player; sessions, waiting ticket, and subtype row cascade.
5. The gateway disconnects all tracked sockets belonging to the user.
6. The route returns `200` with the deleted User object.

Historical games are not deleted and their participants cannot be deleted. Typical failures are
`404 USER_NOT_FOUND` and `409 USER_HAS_GAMES`.

## Automated-opponent endpoint

### `GET /agents`

Lists enabled agents available for `agent:join`. Access: every authenticated role.

Data flow:

1. Authentication and RBAC require `agent:read`.
2. `AutomatedPlayersUseCases` loads all agent configurations.
3. Disabled configurations are skipped.
4. The agent repository joins the parent Player row to expose name and Elo.
5. The route returns `200` with Automated opponent objects.

The response exposes configuration metadata such as think time, but clients cannot override it.
Seeded strategies are `random`, `heuristic`, `monte-carlo`, `strong-search`, `uci`, and `remote`. UCI is returned
only when `UCI_ENGINE_PATH` is configured; remote is returned only when `REMOTE_ENGINE_URL` is
configured. Runtime failures use the configured fallback, but missing configuration is never
presented as a distinct playable engine. See [CHESS_AGENTS.md](CHESS_AGENTS.md).

## Game read and administration endpoints

### `GET /games`

Lists every game. Access: manager/admin.

Data flow:

1. Authentication and RBAC require `game:read:any`.
2. `GamesUseCases.getAllGames` loads every Game entity.
3. Each Game reconstructs its board from compact move history and returns the full Game schema,
   including FEN, derived current/winner IDs, and `whitePlayerName`/`blackPlayerName` display fields.
   Participant IDs remain available for authorization and identity comparisons but clients should
   show the display-name fields to users.
4. The route returns `200` with an array.

### `GET /games/my`

Lists games in which the authenticated user is white or black. Access: every authenticated role.

Data flow:

1. Authentication derives the user ID and RBAC requires `game:read:self`.
2. The games repository filters by either player ID.
3. The use case maps entities to full Game data.
4. The route returns `200` with an array, including active and finished games.

### `GET /games/:gameId`

Reads one authoritative game. Access: a participant, manager, or admin.

Data flow:

1. Authentication establishes the actor.
2. Resource middleware loads the Game through `GamesUseCases.getGame`.
3. Authorization permits managers/admins through `game:read:any`; otherwise the actor ID must equal
   `whitePlayerId` or `blackPlayerId`.
4. The already-loaded Game data is attached to the request and returned as `200`.

This endpoint does not join a socket room. Use socket `game:join` after reconnecting.

### `GET /games/:gameId/legal-moves`

Returns moves legal for the authenticated current player. Access: current participant only.

Data flow:

1. Authentication and RBAC require `game:read:self`.
2. `GamesUseCases` loads the Game.
3. `Game.getLegalMoves` verifies the requester is a participant, the game is active, and it is that
   participant's turn.
4. The domain reconstructs the board and returns compact Legal move objects.
5. The route returns `200` with the array.

Even a manager/admin cannot request legal moves for another player's turn because participation and
turn are domain invariants. Typical failures: `403 NOT_GAME_PARTICIPANT`, `400 GAME_NOT_ACTIVE`, or
`400 NOT_PLAYER_TURN`.

### `DELETE /games/:gameId`

Administratively deletes a game. Access: admin only.

Data flow:

1. Authentication and RBAC require `game:delete`.
2. `GamesUseCases` deletes the game record.
3. The application callback cancels the local clock and removes any runtime agent instance.
4. The route returns `200` with `{ "gameId": "..." }`.

This administrative endpoint does not update statistics and does not broadcast a socket event.
Typical failure: `404 GAME_NOT_FOUND`.

## Error behavior

| HTTP status | Common codes | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR`, `INVALID_JSON`, `INVALID_USER_ROLE`, `INVALID_ROLE_TRANSITION`, `GAME_NOT_ACTIVE`, `NOT_PLAYER_TURN` | Invalid payload or domain action |
| `401` | `INVALID_CREDENTIALS`, `UNAUTHENTICATED` | Failed login or missing/revoked session |
| `403` | `FORBIDDEN`, `NOT_GAME_PARTICIPANT` | Role/resource/domain participation denied |
| `404` | `ROUTE_NOT_FOUND`, `USER_NOT_FOUND`, `GAME_NOT_FOUND` | Route or record missing |
| `409` | `USER_ALREADY_EXISTS`, `USER_HAS_GAMES`, `GAME_ALREADY_EXISTS`, `GAME_CONFLICT` | Restricted, duplicate, or stale write |
| `500` | `INTERNAL_ERROR` | Unexpected failure, details hidden |

Malformed JSON becomes `400 INVALID_JSON`. Unknown methods and paths reach the final middleware and
return `404 ROUTE_NOT_FOUND`. Removed `PATCH` user routes are therefore not compatibility aliases;
clients must use `PUT`.
