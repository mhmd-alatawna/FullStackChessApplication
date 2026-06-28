import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { gameLabel, gameRoute } from "../components/GameCard";
import { ErrorMessage, LoadingPage } from "../components/PageState";

export default function ManageGamesPage() {
  const { user } = useAuth();
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    api.getAllGames().then((result) => setGames(result.slice().reverse())).catch(setError);
  }
  useEffect(load, []);

  async function deleteGame(id) {
    if (!window.confirm(`Delete game ${id}?`)) return;
    try {
      await api.deleteGame(id);
      load();
    } catch (deleteError) {
      setError(deleteError);
    }
  }

  if (!games && !error) return <LoadingPage message="Loading all games…" />;
  return (
    <main className="page">
      <header className="page-heading"><div><p className="eyebrow">Management</p><h1>All games</h1><p>Managers can observe. Admins can also remove game records.</p></div></header>
      <ErrorMessage error={error} />
      <section className="panel table-panel"><table><thead><tr><th>Game</th><th>Players</th><th>State</th><th>Moves</th><th>Actions</th></tr></thead><tbody>
        {games?.map((game) => <tr key={game.id}><td><strong>{game.id.slice(0, 12)}</strong></td><td>{game.whitePlayerName || "White"} <small>vs</small> {game.blackPlayerName || "Black"}</td><td>{gameLabel(game)}</td><td>{game.ply}</td><td><div className="row-actions"><Link className="button button-small button-quiet" to={gameRoute(game)}>Open</Link>{user.role === "admin" && <button className="button button-small button-danger" onClick={() => deleteGame(game.id)}>Delete</button>}</div></td></tr>)}
      </tbody></table></section>
    </main>
  );
}
