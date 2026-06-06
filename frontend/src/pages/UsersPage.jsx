import { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { getAllUsers } from "../services/usersApi";
import { getAllGames } from "../services/gamesApi";
import UsersTable from "../components/UsersTable";
import GameCard from "../components/GameCard";

function UsersPage() {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const auth = { userId: user.userId, userRole: user.userRole };
    setIsLoading(true);
    setError(null);
    async function fetchData() {
      try {
        const [usersData, gamesData] = await Promise.all([
          getAllUsers(auth),
          getAllGames(auth).catch(() => []),
        ]);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setGames(Array.isArray(gamesData) ? gamesData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (isLoading) return <div className="page-loading">Loading users...</div>;
  if (error)     return <div className="page-error">Error: {error}</div>;

  return (
    <div className="page-container">
      <h1 className="page-title">Users</h1>

      <div className="users-list">
        {users.map((u) => (
          <div key={u.userId} className="user-row">
            <span className="user-name">{u.firstName} {u.lastName}</span>
            <span className="badge badge-role">{u.userRole}</span>
            <span className="user-stats">W:{u.wins} L:{u.losses} D:{u.draws}</span>
          </div>
        ))}
      </div>

      <h2 className="section-title">All Games</h2>
      <UsersTable />

      <h2 className="section-title">Recent Games</h2>
      <div className="cards-row">
        {games.slice(0, 6).map((g) => (
          <GameCard
            key={g.id}
            gameId={g.id}
            status={g.status}
            whiteName={`Player ${g.white_player_id ?? "?"}`}
            blackName={`Player ${g.black_player_id ?? "?"}`}
            winner={g.winner}
          />
        ))}
      </div>
    </div>
  );
}

export default UsersPage;
