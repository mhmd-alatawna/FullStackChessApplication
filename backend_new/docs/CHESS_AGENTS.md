# Chess agents

All agents implement one application-facing method:

```js
await agent.chooseMove(gameData, configuration)
// => { from: "e2", to: "e4", promotion: null }
```

The game use case remains responsible for applying and persisting the move. Agent adapters validate
external moves against `gameData.fen` before they reach the domain.

## Available strategies

| Strategy | Implementation | Failure behavior |
|---|---|---|
| `random` | Uniform legal move | Throws only when no legal move exists |
| `heuristic` | Two-ply material and positional minimax | No worker or external dependency |
| `monte-carlo` | Existing rollout worker | Retained as a baseline |
| `strong-search` | Local classical search worker | Returns the best move from the last fully completed depth |
| `uci` | Local UCI child process, such as Stockfish | Falls back to configured local agent |
| `remote` | HTTP or WebSocket engine service | Falls back to configured local agent |

CPU-bound local strategies run in bounded worker pools. Queued work does not pause the persisted
game clock.

The heuristic strategy is intentionally small: it evaluates material, centralization, development,
mobility, bishop pair, castling, checks, promotions, mate, and draw while considering every legal
immediate reply. This is stronger than a greedy capture rule without duplicating the full search
engine.

The directory intentionally has one implementation file per strategy. Search helpers, opening-book
logic, worker entry points, and queues live beside the agent that owns them instead of being split
into small wrapper classes.

UCI and remote rows exist in the database as configuration placeholders, but `GET /api/agents`
omits them until `UCI_ENGINE_PATH` or `REMOTE_ENGINE_URL` is set. Runtime engine failures may fall
back; missing configuration does not silently masquerade as another agent.

## StrongSearchAgent

The local engine uses iterative-deepening negamax with alpha-beta pruning. Every recursive search
checks a monotonic deadline. An interrupted iteration is discarded and the best move from the last
completed depth is returned; if depth one cannot finish, the best ordered legal root move is still
available.

Search features:

- transposition entries with depth, normalized mate score, exact/lower/upper bound, and hash move;
- capture/check/promotion quiescence, with full evasions when in check;
- ordering by hash move, mate, MVV-LVA captures, promotions, checks, two killer moves, and history;
- mate-distance scoring and explicit checkmate/draw/stalemate nodes;
- material and piece-square tables;
- piece mobility, bishop pair, doubled/isolated/passed pawns;
- pawn shelter, castled-king bonus, open king-file penalty, and middlegame/endgame king blending.

This is a substantially stronger local application engine, not a Stockfish replacement. It uses
`chess.js` move generation and FEN transposition keys, favoring correctness and maintainability over
bitboard-level speed.

## Opening books

Set `CHESS_OPENING_BOOK_PATH` to either:

- a Polyglot `.bin` file; or
- a JSON object keyed by the first four FEN fields:

```json
{
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -": [
    { "move": "e2e4", "weight": 10 },
    { "move": "d2d4", "weight": 8 }
  ]
}
```

Book moves are legality-checked. Missing, unreadable, unsupported, or non-matching books are normal
book misses and safely continue into search.

## Configuration

All values have defaults in `src/config.js` and may be overridden through environment variables.
Secrets and service locations are never committed.

| Environment variable | Purpose |
|---|---|
| `STRONG_AGENT_MOVETIME_MS` | Local search budget |
| `STRONG_AGENT_DEPTH` | Iterative-deepening ceiling |
| `STRONG_AGENT_MAX_THREADS` | Concurrent local search workers |
| `STRONG_AGENT_TT_ENTRIES` | Transposition-table capacity per worker |
| `STRONG_AGENT_QUIESCENCE_DEPTH` | Tactical extension ceiling |
| `CHESS_OPENING_BOOK_PATH` | Optional `.bin` or `.json` book |
| `UCI_ENGINE_PATH` | Absolute path to Stockfish or another UCI executable |
| `UCI_ENGINE_DEPTH` | UCI depth ceiling |
| `UCI_ENGINE_MOVETIME_MS` | UCI `go movetime` value |
| `UCI_ENGINE_TIMEOUT_MS` | Whole UCI request timeout |
| `REMOTE_ENGINE_URL` | HTTP(S) or WS(S) engine endpoint |
| `REMOTE_ENGINE_TOKEN` | Optional bearer token |
| `REMOTE_ENGINE_PROVIDER` | `stockfish-online` (default) or `generic` |
| `REMOTE_ENGINE_DEPTH` | Requested remote depth; Stockfish Online is capped at 15 |
| `REMOTE_ENGINE_MOVETIME_MS` | Requested remote movetime |
| `REMOTE_ENGINE_TIMEOUT_MS` | Whole remote request timeout |
| `ENGINE_FALLBACK_AGENT` | `strong-search` (default), `heuristic`, `monte-carlo`, or `random` |

### UCI protocol

The adapter performs `uci`, `isready`, `position fen ...`, and
`go depth <n> movetime <ms>`, then parses `bestmove`. Each request uses an isolated process and kills
it after completion or timeout.

### Remote protocol

For the real Stockfish Online API, configure:

```powershell
$env:REMOTE_ENGINE_PROVIDER="stockfish-online"
$env:REMOTE_ENGINE_URL="https://stockfish.online/api/s/v2.php"
```

The adapter sends `GET <url>?fen=<encoded FEN>&depth=<depth>` and parses responses such as
`{ "success": true, "bestmove": "bestmove e2e4 ponder c7c5" }`.

For a custom HTTP service, set `REMOTE_ENGINE_PROVIDER=generic`. Generic HTTP uses `POST`, and
WebSocket sends one JSON message:

```json
{
  "fen": "current FEN",
  "moves": ["e2e4", "e7e5"],
  "depth": 18,
  "movetime": 1500
}
```

Accepted responses include `{ "move": "e2e4" }`, `{ "bestmove": "e2e4" }`, or
`{ "from": "e2", "to": "e4", "promotion": null }`.

Every strategy returns the same `{ from, to, promotion }` shape. `GamesUseCases.makeMove` reloads
the authoritative persisted game and validates the move through the domain before any AI response
is stored or broadcast.
