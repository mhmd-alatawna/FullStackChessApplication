import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import { getGameState, getLegalMoves, makeMove } from "../services/gamesApi";
import ChessBoard from "../components/ChessBoard";

// Unicode icons reused here for the captured-pieces sidebar section
const pieceIcons = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

// Full game page — manages polling, move submission, and renders ChessBoard + sidebar.
function GamePage() {
  const { gameId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [playerColor, setPlayerColor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ref to track whether a piece is currently selected in ChessBoard.
  // Using a ref (not state) so the polling interval can read the latest value
  // without being re-created every render.
  const selectedRef = useRef(false);

  const auth = user ? { userId: user.userId, userRole: user.userRole } : null;

  // Determines which color this client is playing based on the game data
  function getPlayerColor(g) {
    if (!user) return null;
    if (g.white_player_id === user.userId) return "white";
    if (g.black_player_id === user.userId) return "black";
    return null; // spectator
  }

  // Initial load: fetch game state and legal moves (if it's our turn)
  useEffect(() => {
    if (!auth) return;
    async function load() {
      try {
        const g = await getGameState(auth, gameId);
        setGame(g);
        const color = getPlayerColor(g);
        setPlayerColor(color);

        // Only fetch legal moves when the game is active and it's our turn
        if (g.status === "active" && g.current_turn === color) {
          const lm = await getLegalMoves(auth, gameId);
          setLegalMoves(lm.legal_moves || []);
        }
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    }
    load();
  }, [gameId]); // eslint-disable-line

  // Polling: refresh game state every 300ms to detect opponent moves.
  // Skips poll if a piece is selected (prevents interrupting the user mid-move).
  // Stops polling and clears the interval when the game finishes.
  useEffect(() => {
    if (!auth) return;
    const interval = setInterval(async () => {
      // Don't poll while the player has a piece selected
      if (selectedRef.current) return;
      try {
        const g = await getGameState(auth, gameId);
        setGame(g);
        const color = getPlayerColor(g);
        setPlayerColor(color);

        if (g.status === "finished") {
          clearInterval(interval);
          return;
        }

        // Refresh legal moves only when it's our turn
        if (g.status === "active" && g.current_turn === color) {
          const lm = await getLegalMoves(auth, gameId);
          setLegalMoves(lm.legal_moves || []);
        } else {
          setLegalMoves([]); // clear moves when waiting for the opponent
        }
      } catch (_) {}
    }, 300);

    // Cleanup: always clear the interval when the component unmounts
    return () => clearInterval(interval);
  }, [gameId]); // eslint-disable-line

  // Called by ChessBoard when the player completes a move.
  // Submits the move then immediately refreshes state for a snappy feel.
  async function handleMove(from, to) {
    selectedRef.current = false;
    try {
      await makeMove(auth, gameId, from, to);
      const g = await getGameState(auth, gameId);
      setGame(g);
      const color = getPlayerColor(g);
      if (g.status === "active" && g.current_turn === color) {
        const lm = await getLegalMoves(auth, gameId);
        setLegalMoves(lm.legal_moves || []);
      } else {
        setLegalMoves([]);
      }
    } catch (err) {
      console.error("Move failed:", err.message);
    }
  }

  if (isLoading) return <div className="page-loading">Loading game...</div>;
  if (error)     return <div className="page-error">Error: {error}</div>;
  if (!game)     return null;

  // Pieces with isAlive === false have been captured during the game
  const capturedPieces = Array.isArray(game.game_state)
    ? game.game_state.filter((p) => !p[3])
    : [];

  const isFinished = game.status === "finished";
  const isPending  = game.status === "pending";

  // isCheck from the backend_old is { white: bool, black: bool }
  const isCheckNow = game.isCheck?.[game.current_turn] || false;

  return (
    <div className="game-page">
      {/* Shown while waiting for a second player to join */}
      {isPending && (
        <div className="matchmaking-banner">
          <span className="spinner">⟳</span> Looking for opponent...
        </div>
      )}

      {/* Game-over modal with winner info and a way back to the dashboard */}
      {isFinished && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Game Over</h2>
            <p className="modal-result">
              {game.winner ? `Winner: ${game.winner}` : "It's a Draw!"}
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
              Return Home
            </button>
          </div>
        </div>
      )}

      <div className="game-layout">
        {/* Chess board — receives all state as props, never fetches data itself */}
        <div className="board-area">
          <ChessBoard
            gameState={game.game_state}
            legalMoves={legalMoves}
            currentTurn={game.current_turn}
            playerColor={playerColor}
            isCheck={isCheckNow}
            onMove={handleMove}
            onSelectionChange={(has) => { selectedRef.current = has; }}
          />
        </div>

        {/* Sidebar: game metadata, captured pieces, and move history */}
        <aside className="game-sidebar">
          <div className="sidebar-section">
            <h3>Game Info</h3>
            <p><strong>Game ID:</strong> {game.id}</p>
            <p><strong>Your color:</strong> {playerColor || "spectator"}</p>
            <p><strong>Turn:</strong> {game.current_turn}</p>
            {isCheckNow && <p className="check-warning">♟ Check!</p>}
          </div>

          <div className="sidebar-section">
            <h3>Captured Pieces</h3>
            <div className="captured-pieces">
              {capturedPieces.length === 0
                ? <span className="empty-msg">None</span>
                : capturedPieces.map((p, i) => (
                    <span key={i} className={`chess-piece piece-${p[1]}`}>
                      {pieceIcons[p[1]]?.[p[0]] ?? "?"}
                    </span>
                  ))
              }
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Move History</h3>
            {/* Backend stores moves as { fromPos, toPos, color, piece } */}
            <ol className="move-history">
              {Array.isArray(game.move_history) && game.move_history.length > 0
                ? game.move_history.map((m, i) => (
                    <li key={i}>
                      {typeof m === "string"
                        ? m
                        : (m.fromPos && m.toPos
                            ? `${m.fromPos} → ${m.toPos}`
                            : `${m.from} → ${m.to}`)}
                    </li>
                  ))
                : <li className="empty-msg">No moves yet</li>
              }
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default GamePage;
