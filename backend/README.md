# Chess Grove backend

Express, Socket.IO, Sequelize, MySQL, and chess-agent backend for Chess Grove.

## Install and run

MySQL must be running. The configured user must be able to create `DB_NAME` when it is absent.

```powershell
npm install
Copy-Item .env.example .env   # optional when the defaults are correct
npm start
```

Startup automatically creates the database, applies pending migrations, inserts missing development
accounts/agents, restores active game state, and then listens on `http://localhost:3000`.

## Main directories

```text
models/                    Sequelize table definitions and associations
migrations/               runtime migration runner and ordered schema files
postman/                   importable REST collection
seeders/                   idempotent bootstrap records
src/api/                   Express routes and middleware
src/agents/                automated chess strategies
src/infrastructure/        Sequelize adapter and repositories
src/models/                Game and User domain logic
src/security/              RBAC rules
src/useCases/              application operations
src/websocket/             Socket.IO gateway and game clocks
```

## Development accounts

| Email | Password | Role |
|---|---|---|
| `admin@chessgrove.local` | `admin123` | admin |
| `manager@chessgrove.local` | `manager123` | manager |
| `player@chessgrove.local` | `player123` | user |

Configuration is documented in [the project README](../README.md). Detailed references are in
[`docs/`](./docs), and REST requests are in
[the Postman collection](./postman/Chess_Grove.postman_collection.json).
