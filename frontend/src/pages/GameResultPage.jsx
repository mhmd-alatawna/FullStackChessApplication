import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { ErrorMessage, LoadingPage } from "../components/PageState";
import { isFinished } from "../components/GameCard";

export default function GameResultPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [game, setGame] = useState(location.state?.game || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getGame(gameId)
      .then((loadedGame) => {
        if (!isFinished(loadedGame)) {
          navigate(`/games/${gameId}/play`, { replace: true, state: { game: loadedGame } });
          return;
        }
        setGame(loadedGame);
        refreshUser().catch(() => {});
      })
      .catch(setError);
  }, [gameId, navigate, refreshUser]);

  if (!game && !error) return <LoadingPage message="Loading result…" />;
  if (!game) return <main className="page"><ErrorMessage error={error} /></main>;

  const participated = game.whitePlayerId === user.id || game.blackPlayerId === user.id;
  let title = "Game finished";
  if (game.state === "draw") title = "Draw";
  else if (participated && game.winnerId === user.id) title = "You won";
  else if (participated && game.winnerId && game.winnerId !== user.id) title = "You lost";
  else if (game.state === "cancelled") title = "Game cancelled";
  else if (game.winnerId) title = `${game.winnerId} won`;

  return (
    <main className="result-page">
      <section className="result-card">
        <span className="result-piece">{title === "You won" ? "♛" : title === "Draw" ? "♜" : "♟"}</span>
        <p className="eyebrow">Final result</p>
        <h1>{title}</h1>
        <p>{game.endReason ? game.endReason.replaceAll("_", " ") : "finished"} · {game.ply} ply</p>
        <div className="result-opponents"><span><small>White</small><strong>{game.whitePlayerName || "White"}</strong></span><b>—</b><span><small>Black</small><strong>{game.blackPlayerName || "Black"}</strong></span></div>
        <div className="result-actions"><button className="button button-primary" onClick={() => navigate("/play")}>Play again</button><button className="button button-quiet" onClick={() => navigate("/games")}>Game history</button></div>
      </section>
    </main>
  );
}
