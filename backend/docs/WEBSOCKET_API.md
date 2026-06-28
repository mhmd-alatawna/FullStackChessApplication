# Socket.IO API reference

Socket.IO runs on the same host and port as REST: `http://localhost:3000`. It owns matchmaking,
room membership, live moves, resignation, and game broadcasts.

## Connect and authenticate

Use the token returned by signup or login:

```js
const socket = io("http://localhost:3000", {
  auth: { token: "session-token" },
  transports: ["websocket"]
});
```

The handshake header `Authorization: Bearer <token>` is an alternative. During connection the
gateway resolves the session, attaches safe user identity to the socket, tracks the socket under its
token, and joins it to the private `user:{userId}` room. A failed handshake produces `connect_error`;
its `error.data` is the standard failure envelope.

Before every command, the gateway resolves the token again and rechecks RBAC. A revoked session
therefore cannot continue using an already-connected socket. `UNAUTHENTICATED` also disconnects that
socket.

## Acknowledgements

Every client command should include a callback:

```js
socket.emit("game:sync", { gameId }, (response) => {
  if (!response.success) {
    console.error(response.error);
    return;
  }
  render(response.data);
});
```

Acknowledgements and server broadcasts both use the shared API envelope. Event-specific payloads
are always inside `response.data`.

## Command summary

| Client command | Payload | Success data |
|---|---|---|
| `matching:join` | `{ durationMinutes }` | Waiting result or matched result |
| `matching:cancel` | `{}` | `{ cancelled: true }` |
| `agent:join` | `{ durationMinutes, agentId }` | Immediate automated match result |
| `game:join` | `{ gameId }` | Latest Game |
| `game:sync` | `{ gameId }` | Latest Game |
| `game:legal-moves` | `{ gameId }` | Legal move array |
| `game:move` | `{ gameId, from, to, promotion? }` | Human result or human-plus-agent result |
| `game:resign` | `{ gameId }` | Finished Game |

Every command requires an object payload. `durationMinutes` is converted to a number and must be a
positive integer. Board squares use algebraic values such as `e2`; promotions accept `q`, `r`, `b`,
or `n`.

## Human matchmaking commands

### `matching:join`

Joins the human-versus-human queue selected by time control.

```js
socket.emit("matching:join", { durationMinutes: 10 }, acknowledge);
```

Waiting acknowledgement and `matching:waiting` response:

```json
{
  "success": true,
  "data": {
    "matched": false,
    "ticket": {
      "id": "ticket-id",
      "userId": "3",
      "durationMinutes": 10,
      "createdAt": "2026-06-20T10:00:00.000Z"
    }
  },
  "error": null
}
```

Matched acknowledgement to the second caller:

```json
{
  "success": true,
  "data": {
    "matched": true,
    "game": { "id": "game-id", "state": "white_turn" }
  },
  "error": null
}
```

The actual Game contains every field in the shared Game schema.

Data flow when no opponent is waiting:

1. The gateway revalidates the session and `matching:join` permission.
2. Matchmaking verifies the user exists and is not automated.
3. The duration is normalized and the repositories are checked for an existing user ticket.
4. If one exists, it is returned unchanged; otherwise a generated ticket is stored in that
   duration's queue.
5. The requesting socket receives both an acknowledgement and `matching:waiting`.

Data flow when a compatible opponent is waiting:

1. Matchmaking removes the oldest available ticket from the same duration queue.
2. A Game is created with the waiting user as white and the new caller as black.
3. Adding black changes the game from `waiting` to `white_turn` and starts its clock.
4. The Game is stored; no matchmaking ticket remains for either player.
5. Every currently connected socket in each player's private user room joins `game:{gameId}`.
6. Both user rooms receive `matching:matched` with `{ game, playerColor }` inside `data`.
7. The per-game timeout scheduler starts for white.
8. The second caller's acknowledgement returns `{ matched: true, game }`.

The first player learns about the match from `matching:matched`; the second receives both that event
and its acknowledgement. Different durations never match.

Typical failures: `INVALID_DURATION`, `AGENT_CANNOT_MATCH`, `FORBIDDEN`, or `UNAUTHENTICATED`.

### `matching:cancel`

Removes the authenticated user's waiting ticket.

```js
socket.emit("matching:cancel", {}, acknowledge);
```

Data flow:

1. The gateway revalidates session and `matching:cancel` permission.
2. Matchmaking finds the ticket by authenticated user ID.
3. The repository removes it from its duration queue.
4. The acknowledgement returns `{ "cancelled": true }`.

If the user is not waiting, the result is `MATCHMAKING_TICKET_NOT_FOUND`. This command never cancels
an already-created game.

Compatibility aliases: `matchmaking:join` and `matchmaking:cancel` invoke the same logic. The server
also emits `matchmaking:waiting` and `matchmaking:matched`. New clients should use only `matching:*`
and subscribe to only one namespace to avoid duplicate compatibility notifications.

## Automated game command

### `agent:join`

Creates an immediate game against an enabled automated opponent.

First discover valid IDs through `GET /api/agents`, then emit:

```js
socket.emit("agent:join", {
  durationMinutes: 10,
  agentId: "monte-carlo"
}, acknowledge);
```

Success data:

```json
{
  "matched": true,
  "automated": true,
  "agentId": "monte-carlo",
  "game": {
    "id": "game-id",
    "whitePlayerId": "3",
    "blackPlayerId": "agent-monte-carlo",
    "whitePlayerName": "Regular User",
    "blackPlayerName": "Monte Carlo Bot",
    "state": "white_turn"
  }
}
```

Data flow:

1. The gateway revalidates session and `agent:play` permission.
2. Matchmaking verifies the human exists, is not automated, and has no human-match ticket.
3. It validates the duration, loads the requested enabled agent configuration, and verifies the
   corresponding participant User is automated.
4. A Game is created immediately with the human as white and the agent user as black, then persisted.
5. `AutomatedPlayersUseCases` creates a strategy instance specifically for this game.
6. Only the requesting socket joins `game:{gameId}`; the agent has no socket and other sockets owned
   by the same human do not join automatically.
7. The scheduler starts white's clock and the acknowledgement returns the complete match result.

No matchmaking ticket or waiting event is created. A queued user must first call `matching:cancel`,
otherwise this command returns `USER_ALREADY_QUEUED`. Other failures include `AGENT_NOT_FOUND`,
`INVALID_AGENT`, and `INVALID_DURATION`.

## Game room and read commands

### `game:join`

Restores live room membership for an existing game.

```js
socket.emit("game:join", { gameId: "game-id" }, acknowledge);
```

Data flow:

1. Session and `game:read:self` permission are revalidated.
2. The Game is loaded.
3. A normal user must be a participant; manager/admin `game:read:any` permits observation.
4. The socket joins `game:{gameId}`.
5. If this is an automated game, the runtime strategy is reconstructed if missing.
6. If it is currently the agent's turn, the agent selects and persists a move and the room receives
   `game:updated` or `game:finished`.
7. The acknowledgement returns the latest Game after any automated continuation.

Use this after reconnect, reload, or opening the game from a second socket. Joining is idempotent.

### `game:sync`

Reads the latest authoritative Game after room membership exists.

```js
socket.emit("game:sync", { gameId: "game-id" }, acknowledge);
```

Data flow:

1. Session and read permission are revalidated.
2. The gateway verifies this socket belongs to `game:{gameId}`.
3. The Game is reloaded and participant/privileged access is checked.
4. The acknowledgement returns its complete current data.

This command does not mutate, broadcast, or run an agent. Without a prior automatic match-room join
or explicit `game:join`, it returns `GAME_NOT_JOINED`.

### `game:legal-moves`

Returns legal moves for the authenticated current player.

```js
socket.emit("game:legal-moves", { gameId: "game-id" }, acknowledge);
```

Data flow:

1. Session/read permission and game-room membership are checked.
2. `GamesUseCases` loads the Game and passes the authenticated user ID to the domain.
3. `Game` requires active state, participation, and the user's turn.
4. The board is reconstructed from move history and `chess.js` produces Legal move objects.
5. The acknowledgement returns the array; nothing is broadcast.

Manager/admin observation does not bypass participant/turn rules for this command.

## Game mutation commands

### `game:move`

Applies a participant move and, in an automated game, runs the agent reply.

```js
socket.emit("game:move", {
  gameId: "game-id",
  from: "e2",
  to: "e4",
  promotion: "q"
}, acknowledge);
```

Human-versus-human success data:

```json
{
  "game": { "id": "game-id", "state": "black_turn" },
  "move": { "ply": 1, "uci": "e2e4", "san": "e4" }
}
```

Human-versus-agent success data after the agent replies:

```json
{
  "game": { "id": "game-id", "state": "white_turn", "ply": 2 },
  "move": { "ply": 1, "uci": "e2e4", "san": "e4" },
  "automatedMove": { "ply": 2, "uci": "e7e5", "san": "e5" }
}
```

Human move data flow:

1. Session, `game:move` permission, and room membership are checked.
2. The gateway derives the player ID from the session; payload user IDs are never accepted.
3. `GamesUseCases.makeMove` loads the authoritative Game.
4. `Game.makeMove` verifies active state, participation, turn, clock, coordinates, promotion, and
   chess legality.
5. The domain deducts elapsed time, appends compact UCI/SAN history, advances the state, and detects
   checkmate or automatic draw.
6. The games repository persists the updated Game. A stale concurrent save returns `GAME_CONFLICT`.
7. If terminal, the use case updates both users' statistics and Elo.
8. The gateway emits an enveloped `game:updated` or `game:finished` and reschedules/cancels the
   clock.

Additional automated reply data flow:

1. If the human move is non-terminal, `AutomatedPlayersUseCases.playTurn` receives that newly updated
   Game object.
2. It confirms the runtime agent is the new `currentPlayerId`.
3. The strategy constructs its search board from the updated `game.fen` and selects a legal move.
4. The selected move goes back through the same `GamesUseCases.makeMove`; the use case reloads the
   persisted post-human Game before applying it.
5. The agent result is persisted and emitted as a second `game:updated`, or `game:finished` if the
   reply ends the game.
6. Only after this completes does the acknowledgement return the final Game, human `move`, and
   `automatedMove`.

Therefore an agent-game client can receive the first live update before the command acknowledgement,
then a second update after the agent thinks. The acknowledgement waits for configured agent think
time. If the human move ends the game, no agent runs and the response uses `{ game, move }`.

Typical failures: `GAME_NOT_JOINED`, `NOT_GAME_PARTICIPANT`, `NOT_PLAYER_TURN`, `GAME_NOT_ACTIVE`,
`ILLEGAL_MOVE`, `INVALID_PROMOTION`, or `GAME_CONFLICT`.

### `game:resign`

Forfeits an active game for the authenticated participant.

```js
socket.emit("game:resign", { gameId: "game-id" }, acknowledge);
```

Data flow:

1. Session, `game:resign` permission, and room membership are checked.
2. The use case loads the Game and `Game.resign` verifies active state and participation.
3. The opponent becomes the winner and `endReason` becomes `resignation`.
4. The Game is persisted; both players' statistics and Elo are updated.
5. The gateway cancels the clock and runtime agent.
6. The room receives an enveloped `game:finished` with `{ game, move: null }` inside `data`.
7. The acknowledgement returns the finished Game directly, not a `{ game }` wrapper.

Typical failures: `GAME_NOT_JOINED`, `NOT_GAME_PARTICIPANT`, or `GAME_NOT_ACTIVE`.

## Server-to-client events

| Event | Audience | `data` value | When |
|---|---|---|---|
| `matching:waiting` | Requesting socket | `{ matched: false, ticket }` | Human queue has no opponent |
| `matching:matched` | Both private user rooms | `{ game, playerColor }` | Human game created |
| `game:updated` | `game:{gameId}` | `{ game, move }` | Accepted non-terminal human/agent move |
| `game:finished` | `game:{gameId}` | `{ game, move }` | Checkmate/draw/resignation/timeout |

`playerColor` is `white` or `black`. Checkmate/draw events contain the finishing applied move;
resignation and timeout use `move: null`.

Every game event is `{ success: true, data: { game, move }, error: null }` and contains the complete
Game, so clients can replace local state from `response.data.game`. Events can still be missed during
disconnection; the reconnect flow is:

1. reconnect using the session token;
2. `game:join { gameId }` to restore room membership and get current state;
3. use `game:sync { gameId }` whenever delivery is uncertain.

## Timeout events

The timeout scheduler is server-driven; clients send no timeout command. It schedules the current
player using the persisted clock. When the callback runs, the game use case verifies the same player
is still active, recalculates elapsed time, persists a timeout win, updates statistics/Elo, removes
the runtime agent, and emits `game:finished { game, move: null }`.

## Common failures

Socket failures use the standard error envelope in the acknowledgement. Important codes include:

- `UNAUTHENTICATED`: session missing/revoked; socket is disconnected.
- `FORBIDDEN`: role lacks the requested operation.
- `VALIDATION_ERROR`: payload object or required fields are missing.
- `GAME_NOT_JOINED`: live command used before room membership.
- `NOT_GAME_PARTICIPANT`: authenticated user is not white or black.
- `NOT_PLAYER_TURN`: participant attempted the opponent's turn.
- `GAME_NOT_ACTIVE`: game already ended or is not playable.
- `ILLEGAL_MOVE` / `INVALID_PROMOTION`: chess move rejected.
- `INVALID_DURATION`: time control is not a positive integer.
- `MATCHMAKING_TICKET_NOT_FOUND`: cancellation without a waiting ticket.
- `USER_ALREADY_QUEUED`: agent game requested while waiting for a human.
- `AGENT_NOT_FOUND`: unknown or disabled agent.
- `GAME_CONFLICT`: another write changed the game first.
