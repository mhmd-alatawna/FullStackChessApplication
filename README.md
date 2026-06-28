# Chess Grove

## Project purpose

Chess Grove is a full-stack multiplayer chess application built with React, Express, Socket.IO,
MySQL, and Sequelize. It supports account management, role-based administration, player settings,
live timed games, matchmaking, game history, Elo/statistics, and games against several automated
chess strategies.

Only `backend/` and `frontend/` contain the submitted application:

- `backend/` provides the REST API, Socket.IO server, chess rules, AI agents, database migrations,
  Sequelize models, repositories, and bootstrap data.
- `frontend/` provides the React interface for authentication, settings, administration,
  matchmaking, live games, game results, and history.

## Installation instructions

### Prerequisites

- Node.js 22 or newer
- npm
- MySQL 8 running locally or on a reachable server

No global npm packages are required.

### Start the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env   # recommended when MySQL credentials differ from the defaults
npm start
```

On macOS/Linux, use `cp .env.example .env` instead of `Copy-Item`.

The backend starts at `http://localhost:3000`. Keep this terminal open.

### Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:5173`. The committed development configuration already points the frontend
to `http://localhost:3000`; copy `frontend/.env.example` to `frontend/.env` only when overriding it.

### Seeded accounts

| Email | Password | Role |
|---|---|---|
| `admin@chessgrove.local` | `admin123` | admin |
| `manager@chessgrove.local` | `manager123` | manager |
| `player@chessgrove.local` | `player123` | user |

## Database setup

No manual database or table creation command is required.

When `npm start` runs in `backend/`, startup performs these steps before opening the HTTP port:

1. Connect to MySQL using `backend/.env` or the defaults in `src/config.js`.
2. Detect whether `DB_NAME` exists.
3. Create the database automatically when it is missing.
4. Create `SequelizeMeta` and apply every pending file in `migrations/schema/`.
5. Define the Sequelize associations and initialize the repositories.
6. Insert missing development accounts and built-in chess agents.
7. Restore active game clocks, matchmaking state, and automated games.

The configured MySQL user must be able to connect and create the configured database. For a
dedicated local user, an administrator can run:

```sql
CREATE USER 'chess_app'@'localhost' IDENTIFIED BY 'replace-this-password';
GRANT ALL PRIVILEGES ON chess_project.* TO 'chess_app'@'localhost';
FLUSH PRIVILEGES;
```

Then set `DB_USER=chess_app` and `DB_PASSWORD=replace-this-password` in `backend/.env`. The
application will create `chess_project` itself when it does not exist.

## Environment variables

### Backend

Copy `backend/.env.example` to `backend/.env` when overriding defaults.

| Variable | Default | Purpose |
|---|---|---|
| `APPLICATION_PORT` | `3000` | REST and Socket.IO port |
| `CORS_ORIGIN` | local frontend origins | Comma-separated browser origins allowed by CORS |
| `DB_DIALECT` | `mysql` | Sequelize dialect; this project targets MySQL |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `chess_project` | Automatically created application database |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | empty | MySQL password |
| `MONTE_CARLO_THINK_TIME_MS` | `5000` | Monte Carlo move budget |
| `MONTE_CARLO_MAX_THREADS` | `2` | Monte Carlo worker concurrency |
| `STRONG_AGENT_MOVETIME_MS` | `5000` | Strong-search move budget |
| `STRONG_AGENT_DEPTH` | `64` | Iterative-deepening ceiling |
| `STRONG_AGENT_MAX_THREADS` | `2` | Strong-search worker concurrency |
| `STRONG_AGENT_TT_ENTRIES` | `200000` | Transposition-table capacity |
| `STRONG_AGENT_QUIESCENCE_DEPTH` | `10` | Quiescence-search ceiling |
| `CHESS_OPENING_BOOK_PATH` | empty | Optional JSON or Polyglot opening book |
| `UCI_ENGINE_PATH` | empty | Optional local UCI engine executable |
| `UCI_ENGINE_DEPTH` | `18` | Requested UCI search depth |
| `UCI_ENGINE_MOVETIME_MS` | `1500` | Requested UCI move time |
| `UCI_ENGINE_TIMEOUT_MS` | `6000` | Local-engine timeout |
| `REMOTE_ENGINE_URL` | empty | Optional HTTP(S) or WS(S) engine endpoint |
| `REMOTE_ENGINE_TOKEN` | empty | Optional remote-engine bearer token |
| `REMOTE_ENGINE_PROVIDER` | `stockfish-online` | Remote response adapter |
| `REMOTE_ENGINE_DEPTH` | `15` | Requested remote search depth |
| `REMOTE_ENGINE_MOVETIME_MS` | `1500` | Requested remote move time |
| `REMOTE_ENGINE_TIMEOUT_MS` | `6000` | Remote-engine timeout |
| `ENGINE_FALLBACK_AGENT` | `strong-search` | Local strategy used if an external engine fails |

Empty UCI and remote-engine values disable those optional agents.

### Frontend

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5173` | React development-server port |
| `REACT_APP_API_BASE_URL` | `http://localhost:3000` | Backend origin used for REST and Socket.IO |

## ORM setup

The backend uses Sequelize 6 with MySQL:

- `backend/models/` contains one Sequelize definition per database table.
- `backend/models/index.js` initializes associations.
- `backend/migrations/schema/` contains the complete ordered physical schema.
- `backend/migrations/MigrationRunner.js` applies pending migrations and records them in
  `SequelizeMeta`.
- `backend/src/infrastructure/sequelize/connection.js` owns connection and database creation.
- `backend/src/infrastructure/sequelize/SequelizeDataAccess.js` exposes repositories and
  transaction-scoped repositories to the application.
- `backend/seeders/ensureInitialData.js` inserts missing development accounts and built-in agents.

The schema contains `players`, `normal_users`, `admin_users`, `agents`, `games`, `game_moves`,
`game_participants`, `sessions`, and `matchmaking_tickets`.

Important relationships:

- `Player` has one `NormalUser`, `AdminUser`, or `Agent` subtype.
- `Game` has many `GameMove` rows and two `GameParticipant` rows.
- `GameParticipant` belongs to both `Game` and `Player`.
- `Player` has many `Session` rows and at most one `MatchmakingTicket`.
- Cascades remove dependent sessions, moves, participants, and subtype rows where appropriate.

Routes and use cases do not query Sequelize directly; all database access goes through repository
adapters. See [the detailed schema](backend/docs/DATABASE_SCHEMA.md).

## API endpoints

REST base URL: `http://localhost:3000/api`.

Except for health, signup, and login, requests require:

```http
Authorization: Bearer <session-token>
```

Every response uses `{ "success": boolean, "data": any|null, "error": object|null }`.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Confirm successful backend/database startup |
| `POST` | `/api/auth/signup` | Create a normal user and authenticated session |
| `POST` | `/api/auth/login` | Log in by email, ID, or first/last name |
| `POST` | `/api/auth/logout` | Revoke the current session |
| `GET` | `/api/users/me` | Read the current profile |
| `PUT` | `/api/users/me` | Update the current profile/password |
| `GET` | `/api/users` | List users; manager/admin |
| `POST` | `/api/users` | Create a user; manager/admin with role restrictions |
| `GET` | `/api/users/:userId` | Read an allowed user profile |
| `PUT` | `/api/users/:userId` | Update an allowed user profile |
| `PUT` | `/api/users/:userId/role` | Change user/manager role; admin |
| `DELETE` | `/api/users/:userId` | Delete a user without protected game history; admin |
| `GET` | `/api/settings` | Read the current user's settings |
| `PUT` | `/api/settings` | Update name, email, and theme |
| `GET` | `/api/agents` | List configured automated opponents |
| `GET` | `/api/games/my` | List games for the current player |
| `GET` | `/api/games` | List every game; manager/admin |
| `GET` | `/api/games/:gameId` | Read an accessible game |
| `GET` | `/api/games/:gameId/legal-moves` | List legal moves for the active participant |
| `DELETE` | `/api/games/:gameId` | Delete a game; manager/admin |

Import [Chess_Grove.postman_collection.json](backend/postman/Chess_Grove.postman_collection.json)
into Postman for ready-to-run requests. Run **Login as admin** first; the collection stores the
bearer token. Running **Create user** stores `createdUserId` for the remaining CRUD requests.

## WebSocket feature

Socket.IO runs on `http://localhost:3000` and authenticates during connection:

```js
const socket = io("http://localhost:3000", {
  auth: { token },
});
```

Commands acknowledge with the same `{ success, data, error }` envelope used by REST.

| Command | Main payload | Purpose |
|---|---|---|
| `matching:join` | `{ durationMinutes }` | Join human matchmaking |
| `matching:cancel` | `{}` | Leave matchmaking |
| `agent:join` | `{ durationMinutes, agentId }` | Create a game against an AI agent |
| `game:join` | `{ gameId }` | Join the private game room |
| `game:sync` | `{ gameId }` | Reload authoritative game state |
| `game:legal-moves` | `{ gameId }` | Read legal moves for the current turn |
| `game:move` | `{ gameId, from, to, promotion? }` | Submit a legal move |
| `game:resign` | `{ gameId }` | Resign an active game |

The backend emits `matching:waiting`, `matching:matched`, `game:updated`, and `game:finished`.
Legacy `matchmaking:*` aliases are also accepted. Games, moves, clocks, results, Elo, and statistics
are persisted in MySQL. See [the Socket.IO reference](backend/docs/WEBSOCKET_API.md).

## AI feature

The frontend can create an immediate game against an enabled automated opponent. Every AI move is
validated by the same `Game` domain model used for human moves before it is persisted and broadcast.

Available strategies:

- **Random**: selects a random legal move.
- **Heuristic**: uses a short tactical/material search.
- **Monte Carlo**: evaluates moves through randomized rollouts in a worker pool.
- **Strong search**: iterative-deepening alpha-beta/negamax with quiescence, evaluation,
  transposition storage, and optional opening-book support.
- **Local UCI**: communicates with an optional Stockfish-compatible executable.
- **Remote engine**: communicates with an optional HTTP or WebSocket chess service.

UCI and remote agents remain hidden until their path or URL is configured. External failures use
the configured local fallback agent. See [the AI documentation](backend/docs/CHESS_AGENTS.md).

## Known limitations

- Passwords are stored as plain text and are suitable only for coursework/development.
- Session tokens are opaque database records; no expiry policy is enabled by default.
- The automatic database creation path and schema target MySQL 8.
- The initial migration represents the current complete schema; future schema changes require new
  ordered migration files.
- Active Socket.IO rooms, AI worker jobs, and timers are process-local, although authoritative game
  state and clocks are persisted and restored after restart.
- AI calculations do not pause a running chess clock.
- Local UCI and remote-engine play depend on external executables/services and may fail or be rate
  limited; local fallback reduces but cannot eliminate that dependency.
- Draw offers are not implemented; rule-based draws, resignation, timeout, and checkmate are.
- The interface is primarily designed for desktop-sized screens.
- `npm audit` reports transitive dependency findings, especially in the Create React App 5 toolchain;
  replacing that legacy build tool is future production-hardening work.
