import { Link } from "react-router-dom";

const finishedStates = new Set(["white_won", "black_won", "draw", "cancelled"]);

export function gameLabel(game) {
  const labels = {
    waiting: "Waiting",
    white_turn: "White to move",
    black_turn: "Black to move",
    white_won: "White won",
    black_won: "Black won",
    draw: "Draw",
    cancelled: "Cancelled",
  };
  return labels[game.state] || game.state;
}

export function gameRoute(game) {
  return finishedStates.has(game.state) ? `/games/${game.id}/result` : `/games/${game.id}/play`;
}

export function isFinished(game) {
  return finishedStates.has(game.state);
}

export default function GameCard({ game }) {
  return (
    <article className="game-card">
      <div className="game-card-heading">
        <span className={`status-badge ${isFinished(game) ? "finished" : "active"}`}>{gameLabel(game)}</span>
        <span className="game-ply">{game.ply} moves</span>
      </div>
      <div className="game-opponents">
        <div><span className="color-token white-token" /> <strong>{game.whitePlayerName || "White"}</strong></div>
        <span className="versus">vs</span>
        <div><span className="color-token black-token" /> <strong>{game.blackPlayerName || "Waiting"}</strong></div>
      </div>
      <div className="game-card-footer">
        <span>{game.clock ? `${game.clock.durationMinutes} min` : "Untimed"}</span>
        <Link className="button button-small" to={gameRoute(game)}>{isFinished(game) ? "View result" : "Open game"}</Link>
      </div>
    </article>
  );
}
