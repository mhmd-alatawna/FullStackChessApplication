import { useEffect, useState } from "react";

function remainingTime(game, color) {
  if (!game.clock) return null;
  let remaining = color === "white" ? game.clock.whiteRemainingMs : game.clock.blackRemainingMs;
  const activeColor = game.state === "white_turn" ? "white" : game.state === "black_turn" ? "black" : null;
  if (activeColor === color && game.clock.turnStartedAt) {
    remaining -= Math.max(0, Date.now() - new Date(game.clock.turnStartedAt).getTime());
  }
  return Math.max(0, remaining);
}

function formatTime(milliseconds) {
  if (milliseconds === null) return "—";
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function PlayerClock({ game, color }) {
  const [remaining, setRemaining] = useState(() => remainingTime(game, color));
  const active = game.state === `${color}_turn`;

  useEffect(() => {
    setRemaining(remainingTime(game, color));
    const timer = window.setInterval(() => setRemaining(remainingTime(game, color)), 250);
    return () => window.clearInterval(timer);
  }, [game, color]);

  return <div className={`player-clock ${active ? "active" : ""}`}>{formatTime(remaining)}</div>;
}
