import { useEffect, useState } from "react";
import api from "../services/api";
import GameCard from "../components/GameCard";
import { EmptyState, ErrorMessage, LoadingPage } from "../components/PageState";

export default function GamesPage() {
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMyGames().then((result) => setGames(result.slice().reverse())).catch(setError);
  }, []);

  if (!games && !error) return <LoadingPage message="Loading your games…" />;
  return (
    <main className="page">
      <header className="page-heading"><div><p className="eyebrow">History</p><h1>Your games</h1><p>Active games reopen the board. Finished games open a dedicated result page.</p></div></header>
      <ErrorMessage error={error} />
      {games?.length ? <div className="game-card-grid">{games.map((game) => <GameCard game={game} key={game.id} />)}</div> : <EmptyState title="No games yet">Start from the Play page.</EmptyState>}
    </main>
  );
}
