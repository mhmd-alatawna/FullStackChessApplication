// Reusable card component for displaying a chess game summary.
// Props:
//   gameId    — unique game identifier (number or string)
//   status    — "active" | "pending" | "finished"
//   whiteName — display name of the white player
//   blackName — display name of the black player
//   winner    — winner color string, or null/undefined for a draw / ongoing game
function GameCard({ gameId, status, whiteName, blackName, winner }) {

  // Returns a colored badge based on the game's current status
  function statusBadge(s) {
    if (s === "finished") return <span className="badge badge-finished">Finished</span>;
    if (s === "active")   return <span className="badge badge-active">Active</span>;
    return <span className="badge badge-pending">Pending</span>;
  }

  return (
    <div className="game-card">
      <div className="game-card-header">
        <span className="game-card-id">Game #{gameId}</span>
        {statusBadge(status)}
      </div>

      <div className="game-card-players">
        <span className="piece-white">♔</span> {whiteName || "White"}
        <span className="vs"> vs </span>
        <span className="piece-black">♚</span> {blackName || "Black"}
      </div>

      {/* Show the result only once the game is over */}
      {status === "finished" && (
        <div className="game-card-result">
          {winner ? `Winner: ${winner}` : "Draw"}
        </div>
      )}
    </div>
  );
}

export default GameCard;
