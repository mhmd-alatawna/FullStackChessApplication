import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import { getUserById } from "../services/usersApi";
import { requestMatch, getMyGames, getAllGames } from "../services/gamesApi";
import GameCard from "../components/GameCard";

function DashboardPage() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const auth = { userId: user.userId, userRole: user.userRole };
    setIsLoading(true);
    setError(null);
    async function fetchData() {
      try {
        const userData = await getUserById(auth, user.userId);
        setStats(userData);

        // Fetch games based on role:
        // - admin/manager: GET /games/ returns all games → filter to this user's games client-side
        // - user: GET /games/my_games returns only their games (server-side filter by x-user-id)
        let myGames = [];
        if (user.userRole === "admin" || user.userRole === "manager") {
          const all = await getAllGames(auth);
          myGames = Array.isArray(all)
            ? all.filter((g) => g.white_player_id === user.userId || g.black_player_id === user.userId)
            : [];
        } else {
          myGames = await getMyGames(auth);
          if (!Array.isArray(myGames)) myGames = [];
        }
        setGames(myGames);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user]);

  async function handleFindMatch() {
    setMatchError(null);
    setMatchLoading(true);
    try {
      const auth = { userId: user.userId, userRole: user.userRole };
      const result = await requestMatch(auth, 10);
      navigate(`/game/${result.gameId}`);
    } catch (err) {
      setMatchError(err.message || "Failed to find a match.");
    } finally {
      setMatchLoading(false);
    }
  }

  if (isLoading) return <div className="page-loading">Loading dashboard...</div>;
  if (error)     return <div className="page-error">Error: {error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {stats?.firstName} {stats?.lastName}</h1>
        <button className="btn btn-primary" onClick={handleFindMatch} disabled={matchLoading}>
          {matchLoading ? "Finding match..." : "♟ Find Match"}
        </button>
      </div>
      {matchError && <p className="error-msg">{matchError}</p>}

      <h2 className="section-title">Your Stats</h2>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats?.wins ?? 0}</div><div className="stat-label">♟ Wins</div></div>
        <div className="stat-card"><div className="stat-value">{stats?.losses ?? 0}</div><div className="stat-label">✕ Losses</div></div>
        <div className="stat-card"><div className="stat-value">{stats?.draws ?? 0}</div><div className="stat-label">⊖ Draws</div></div>
      </div>

      <h2 className="section-title">Recent Games</h2>
      {games.length === 0 ? (
        <p className="empty-msg">No games yet. Find a match to start playing!</p>
      ) : (
        <>
          {/* Usage #1 — latest game highlighted as a standalone card */}
          <h3 className="subsection-title">Latest Game</h3>
          <GameCard
            gameId={games[0].id}
            status={games[0].status}
            whiteName={`Player ${games[0].white_player_id ?? "?"}`}
            blackName={`Player ${games[0].black_player_id ?? "?"}`}
            winner={games[0].winner}
          />

          {/* Usage #2 — full list via .map() */}
          <h3 className="subsection-title">All My Games</h3>
          <div className="cards-row">
          {games.slice(0, 10).map((g) => (
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
        </>
      )}
    </div>
  );
}

export default DashboardPage;
