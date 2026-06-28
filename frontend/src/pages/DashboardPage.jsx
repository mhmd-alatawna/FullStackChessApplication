import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Card from "../components/Card";
import DataTable from "../components/DataTable";
import { ErrorMessage, LoadingPage } from "../components/PageState";
import { gameLabel, gameRoute } from "../components/GameCard";

const columns = [
  { key: "players", label: "Players", render: (game) => `${game.whitePlayerName || "White"} vs ${game.blackPlayerName || "Waiting"}` },
  { key: "state", label: "State", render: (game) => <span className={`status-badge ${game.winnerId || game.state === "draw" ? "finished" : ""}`}>{gameLabel(game)}</span> },
  { key: "clock", label: "Clock", render: (game) => game.clock ? `${game.clock.durationMinutes} minutes` : "Untimed" },
  { key: "ply", label: "Moves", render: (game) => game.ply },
  { key: "open", label: "Action", render: (game) => <Link className="button button-small" to={gameRoute(game)}>Open</Link> },
];

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getMe(), api.getMyGames()])
      .then(([currentUser, myGames]) => {
        setUser(currentUser);
        setGames(myGames.slice().reverse());
      })
      .catch(setError);
  }, []);

  if (!user && !error) return <LoadingPage message="Loading dashboard…" />;

  return (
    <main className="page dashboard-page">
      <header className="page-heading dashboard-heading">
        <div><p className="eyebrow">Assignment 3 dashboard</p><h1>{user ? `Welcome, ${user.firstName}` : "Dashboard"}</h1><p>Your profile and games are loaded from the Assignment 2 REST API.</p></div>
        <Link className="button button-primary" to="/play">Start a game</Link>
      </header>
      <ErrorMessage error={error} />
      {user && <section className="summary-grid" aria-label="Player summary">
        <Card title="Elo rating" value={user.elo} description="Current competitive rating" />
        <Card title="Wins" value={user.wins} description="Completed victories" />
        <Card title="Losses" value={user.losses} description="Completed defeats" />
        <Card title="Draws" value={user.draws} description="Shared results" />
      </section>}
      <section className="content-section">
        <div className="section-heading"><div><h2>Game data</h2><p>A reusable table populated by `GET /api/games/my`.</p></div><span className="muted">{games?.length || 0} games</span></div>
        {games && <DataTable columns={columns} rows={games} emptyMessage="No games yet. Start a human or automated game from the Play page." />}
      </section>
    </main>
  );
}
