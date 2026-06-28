# Chess backend v2

Backend v2 provides bearer-session REST APIs, Socket.IO matchmaking/games, timed chess, statistics,
Elo, and random, heuristic, Monte Carlo, classical-search, UCI, or remote-engine opponents. The executable
server persists through MySQL/Sequelize.

## Database setup and start

Copy `.env.example` to `.env` and set the local MySQL connection:

```text
DB_DIALECT
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
APPLICATION_PORT
CORS_ORIGIN
MONTE_CARLO_THINK_TIME_MS
MONTE_CARLO_MAX_THREADS
STRONG_AGENT_MOVETIME_MS
STRONG_AGENT_MAX_THREADS
```

UCI, remote-engine, book, and detailed search settings may be supplied through environment
variables. Unconfigured external engines are not returned by `GET /api/agents`; see
[Chess agents](./docs/CHESS_AGENTS.md).

```powershell
npm.cmd install
npm.cmd start
```

The default HTTP/Socket.IO address is `http://localhost:3000`. Startup creates the configured MySQL
database when missing, creates its tables, and inserts initial users/agents when `players` is empty.

## Validation

```powershell
npm.cmd test
npm.cmd run check
```

`npm test` creates `${database_name}_end_to_end`, runs complete REST, Socket.IO, MySQL, human-game,
and worker-agent flows, then removes that database. The configured MySQL user therefore needs
create/drop-database permission during testing.

## Seeded development players

| ID | Password | Stored as |
|---|---|---|
| `1` / `admin@chessgrove.local` | `admin123` | admin |
| `2` / `manager@chessgrove.local` | `manager123` | normal user with manager role |
| `3` / `player@chessgrove.local` | `player123` | normal user |
| `agent-random` | Cannot log in | agent |
| `agent-heuristic` | Cannot log in | agent |
| `agent-monte-carlo` | Cannot log in | agent |
| `agent-strong-search` | Cannot log in | agent |
| `agent-uci` | Cannot log in | agent |
| `agent-remote` | Cannot log in | agent |

The UCI and remote rows are configuration placeholders. They become selectable only after their
engine path or service URL is configured.

## Documentation map

- [API contract and shared schemas](./API_CONTRACT.md)
- [Complete user flows](./docs/USER_FLOWS.md)
- [Detailed REST endpoints](./docs/REST_API.md)
- [Detailed Socket.IO commands and events](./docs/WEBSOCKET_API.md)
- [Architecture and runtime data flow](./docs/ARCHITECTURE.md)
- [Implemented MySQL schema](./docs/DATABASE_SCHEMA.md)
- [Monte Carlo agent](./docs/MONTE_CARLO_AGENT.md)
- [Strong, UCI, remote, and opening-book agents](./docs/CHESS_AGENTS.md)
- [Deferred production work](./DEFERRED_WORK.md)

## Source layout

```text
src/
  api/                    middleware and REST transport adapters
  domain/                 Game and User rules/state
  agents/                 move-selection strategies
  ../migrations/
    contracts/            runtime repository contract
    sequelize/            Database and Sequelize models
    repositories/         ORM repository implementations
  security/               shared operation-level RBAC
  useCases/               grouped application operations
  websocket/              commands, rooms, events, timeout scheduler
```

Tests use the same composed application and MySQL repositories as the executable server.

Routes/sockets never access Sequelize. Grouped use cases depend on repository contracts, while
chess legality, turns, clocks, and terminal transitions remain inside `Game`.
