# Monte Carlo automated player

The Monte Carlo strategy searches in Node worker threads, never on the HTTP/Socket.IO event-loop
thread.

## Configuration

`src/config.js` contains the two global controls:

```js
monte_carlo_think_time_ms: 5000,
monte_carlo_max_threads: 2,
```

- `monte_carlo_think_time_ms` is the search budget for every Monte Carlo move.
- `monte_carlo_max_threads` is the maximum number of simultaneous searches in this server process.

Agent database configuration still controls strategy details such as rollout depth and exploration,
but it cannot override the global time budget.

## Flow

1. A human move is validated and persisted normally.
2. The gateway broadcasts the enveloped human update and starts the agent's game clock.
3. `AutomatedPlayersUseCases` submits the current Game/FEN to the bounded worker queue defined in
   `MonteCarloChessAgent.js`.
4. If a worker slot is available, a worker starts immediately. Otherwise the request waits FIFO.
5. Game clocks continue running while the search is queued or executing.
6. The worker posts only `{ from, to, promotion }` back to the main process.
7. `GamesUseCases.makeMove` reloads the authoritative Game and applies the move normally.
8. The gateway broadcasts the enveloped agent update or terminal result.

If a queued agent loses on time or the Game changes before its worker result is applied, the stale
move is discarded and the latest persisted Game is returned. Worker threads are terminated during
application shutdown.

## Search strategy

Each search:

- immediately selects a checkmate in one;
- uses Monte Carlo tree selection with exploration;
- biases rollouts toward captures, checks, promotions, castling, development, and central control;
- evaluates unfinished rollouts using material, position, mobility, and king safety;
- returns a legal move before the configured search budget ends.

Search-tree memory is move-local. Persisted FEN, move history, and agent configuration are sufficient
to reconstruct work after a server restart.
