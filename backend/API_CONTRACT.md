# Backend v2 contract

This file defines the shared data contract used by both REST and Socket.IO. Detailed transport
operations are documented in [REST_API.md](./docs/REST_API.md) and
[WEBSOCKET_API.md](./docs/WEBSOCKET_API.md). Complete client journeys are documented in
[USER_FLOWS.md](./docs/USER_FLOWS.md).

## Transport addresses

- REST base URL: `http://localhost:3000/api`
- Socket.IO URL: `http://localhost:3000`
- Default port: `3000`
- All REST responses, socket acknowledgements, handshake errors, and socket events are JSON.

## Standard envelope

Every REST and Socket.IO entry point uses the same shape.

Success:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Failure:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

REST responses also contain an `x-request-id` header. Unexpected failures are logged server-side and
returned as `500 INTERNAL_ERROR` without a stack trace.

## Authentication

Signup and login return an opaque session token. Protected REST requests send:

```http
Authorization: Bearer <token>
```

Socket.IO sends the same token in `auth.token` or the handshake `Authorization` header. The socket
gateway validates it during connection and again before every command. Logout removes only the
presented session, disconnects sockets using that token, and removes the user's waiting matchmaking
ticket. Other sessions belonging to the same user are not revoked.

Passwords are currently stored as plain text by explicit project requirement, but are never included
in API responses. Automated users cannot log in.

## Role capabilities

All three roles can read/update themselves, read/play their own games, match with humans, and start
agent games.

| Capability | user | manager | admin |
|---|:---:|:---:|:---:|
| Read/update own profile | Yes | Yes | Yes |
| Match and play | Yes | Yes | Yes |
| List agents/start agent game | Yes | Yes | Yes |
| List/read/update any user | No | Yes | Yes |
| Create users | No | Yes | Yes |
| Create an admin user | No | No | Yes |
| Read any game | No | Yes | Yes |
| Change roles | No | No | Yes |
| Delete users or games | No | No | Yes |

Manager/admin read access does not make them game participants. Moving, resigning, and requesting
legal moves still require participation and, where appropriate, the current turn.

Role changes only switch normal accounts between `user` and `manager`. Admin accounts are created in
their separate table and cannot be promoted from or demoted into normal accounts. Identities with game
history cannot be deleted.

## Shared schemas

### User

```json
{
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
```

Roles are `user`, `manager`, and `admin`. `isAutomated` describes the account type and is independent
from role.

### Game

```json
{
  "id": "game-id",
  "whitePlayerId": "3",
  "whitePlayerName": "Regular User",
  "blackPlayerId": "agent-random",
  "blackPlayerName": "Random Bot",
  "state": "white_turn",
  "moves": [
    { "uci": "e2e4", "san": "e4" },
    { "uci": "e7e5", "san": "e5" }
  ],
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  "ply": 2,
  "endReason": null,
  "clock": {
    "durationMinutes": 10,
    "whiteRemainingMs": 599500,
    "blackRemainingMs": 599700,
    "turnStartedAt": "2026-06-20T10:00:01.000Z"
  },
  "currentPlayerId": "3",
  "winnerId": null
}
```

Ongoing states: `waiting`, `white_turn`, `black_turn`.

Terminal states: `white_won`, `black_won`, `draw`, `cancelled`.

End reasons: `checkmate`, `stalemate`, `repetition`, `insufficient_material`,
`fifty_move_rule`, `resignation`, `timeout`, `cancelled`, `other_draw`.

`currentPlayerId` is non-null only during an active turn. `winnerId` is non-null only for
`white_won` or `black_won`. The clock's stored remaining value is finalized at each move; while a
turn is active, clients can calculate the display value by subtracting the time elapsed since
`turnStartedAt` from the active player's stored remaining milliseconds.

Player IDs remain stable identity references for commands. Player names are presentation fields so
clients do not need another request merely to render a game or game-history entry.

### Applied move

```json
{
  "ply": 1,
  "uci": "e2e4",
  "san": "e4"
}
```

The applied move returned by a move command contains `ply`. Entries in `game.moves` intentionally
contain only `uci` and `san`; the array index determines their ply.

### Legal move

```json
{
  "from": "e7",
  "to": "e5",
  "promotion": null,
  "san": "e5"
}
```

Promotion values are `q`, `r`, `b`, or `n`. If a promotion move omits the value, the domain promotes
to a queen.

### Matchmaking ticket

```json
{
  "id": "ticket-id",
  "userId": "3",
  "durationMinutes": 10,
  "createdAt": "2026-06-20T10:00:00.000Z"
}
```

### Automated opponent

```json
{
  "id": "monte-carlo",
  "name": "Monte Carlo Bot",
  "strategy": "monte-carlo",
  "difficulty": "advanced",
  "elo": 1600,
  "thinkTimeMs": 400
}
```

Clients select the public agent `id`; the server owns its strategy configuration. `thinkTimeMs` comes
from `config.monte_carlo_think_time_ms`, and concurrent searches are limited by
`config.monte_carlo_max_threads`.

## Game result data flow

Checkmate/draw is recognized inside `Game.makeMove`; resignation and timeout have dedicated domain
operations. Every non-cancelled terminal result is persisted, then both players receive one updated
win/loss/draw count and a K-factor-32 Elo change. Automated players use the same user statistics path.
The gateway then cancels the clock and runtime agent and emits `game:finished`.

## Compatibility decisions

- `matching:*` is canonical. `matchmaking:join`, `matchmaking:cancel`, and matching notification
  aliases remain supported for old clients.
- Live game mutation is socket-only. REST reads authoritative users, games, legal moves, and agents.
- `game:join` restores room membership; `game:sync` reads authoritative state after joining.
- User updates use `PUT`. Removed `PATCH` routes return `404 ROUTE_NOT_FOUND`.
- Draw offers are not implemented; automatic chess draws are implemented.
