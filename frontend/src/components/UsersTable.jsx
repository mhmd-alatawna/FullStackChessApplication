import { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { getAllGames } from "../services/gamesApi";

function UsersTable() {
  const { user } = useUser();
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    async function fetchGames() {
      try {
        const data = await getAllGames({ userId: user.userId, userRole: user.userRole });
        setGames(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGames();
  }, [user]);

  if (isLoading) return <p className="page-loading">Loading games...</p>;
  if (error)     return <p className="error-msg">Error: {error}</p>;
  if (games.length === 0) return <p className="empty-msg">No games found.</p>;

  return (
    <div className="table-wrapper">
      <table className="chess-table">
        <thead>
          <tr>
            <th>Game ID</th>
            <th>Status</th>
            <th>White Player ID</th>
            <th>Black Player ID</th>
            <th>Winner</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.id}>
              <td>{g.id}</td>
              <td><span className={`badge badge-${g.status}`}>{g.status}</span></td>
              <td>{g.white_player_id ?? "—"}</td>
              <td>{g.black_player_id ?? "—"}</td>
              <td>{g.winner ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UsersTable;
