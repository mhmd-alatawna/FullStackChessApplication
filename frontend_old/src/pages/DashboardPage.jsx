import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import { getUserById } from "../services/usersApi";
import { requestMatch, getAllGames } from "../services/gamesApi";
import GameCard from "../components/GameCard";

function DashboardPage() {
  const { user } = useUser();
  const navigate = useNavigate();

  // User stats (wins, losses, draws) fetched from the server
  const [stats, setStats] = useState(null);
  // All games involving the logged-in user
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Separate loading/error state for the "Find Match" action
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);

  // On mount: fetch user stats and game history in parallel
  useEffect(() => {
    if (!user) return;
    const auth = { userId: user.userId, userRole: user.userRole };
    setIsLoading(true);
    Promise.all([
      getUserById(auth, user.userId),
      getAllGames(auth).catch(() => []), // gracefully handle permission errors
    ])
      .then(([userData, allGames]) => {
        setStats(userData);
        // Filter only games where the logged-in user is a participant
        const myGames = Array.isArray(allGames)
          ? allGames.filter((g) => g.white_player_id === user.userId || g.black_player_id === user.userId)
          : [];
        setGames(myGames);
        setIsLoading(false);
      })
      .catch((err) => { setError(err.message); setIsLoading(false); });
  }, [user]);

  // Calls matchmaking endpoint and navigates to the new game page
  async function handleFindMatch() {
    setMatchError(null);
    setMatchLoading(true);
    try {
      const auth = { userId: user.userId, userRole: user.userRole };
      // duration: 10 minutes per side
      const result = await requestMatch(auth, 10);
      navigate(`/game/${result.gameId}`);
    } catch (err) {
      setMatchError(err.message || "Failed to find a match.");
    } finally {
      setMatchLoading(false);
    }
  }

  if (isLoading) return <div className="page-loading">Loading dashboard...</div>;
  if (error) return <div className="page-error">Error: {error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {stats?.firstName} {stats?.lastName}</h1>
        <button className="btn btn-primary" onClick={handleFindMatch} disabled={matchLoading}>
          {matchLoading ? "Finding match..." : "♟ Find Match"}
        </button>
      </div>
      {matchError && <p className="error-msg">{matchError}</p>}

      {/* Stats summary — large visual numbers */}
      <h2 className="section-title">Your Stats</h2>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats?.wins ?? 0}</div><div className="stat-label">♟ Wins</div></div>
        <div className="stat-card"><div className="stat-value">{stats?.losses ?? 0}</div><div className="stat-label">✕ Losses</div></div>
        <div className="stat-card"><div className="stat-value">{stats?.draws ?? 0}</div><div className="stat-label">⊖ Draws</div></div>
      </div>



      {/* Recent games list — shows up to 10 of the user's games */}
      <h2 className="section-title">Recent Games</h2>
      {games.length === 0 ? (
        <p className="empty-msg">No games yet. Find a match to start playing!</p>
      ) : (
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
      )}
    </div>
  );
}

export default DashboardPage;
