import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLive } from "../context/LiveContext";
import { ErrorMessage } from "../components/PageState";

export default function MatchmakingPage() {
  const { connected, waitingTicket, setWaitingTicket, matchedGame, clearMatchedGame, command } = useLive();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const completed = useRef(false);
  const [error, setError] = useState(null);
  const minutes = Number(searchParams.get("minutes") || 10);

  useEffect(() => {
    if (!connected || started.current) return;
    started.current = true;
    command("matching:join", { durationMinutes: minutes })
      .then((result) => {
        if (result.matched) {
          completed.current = true;
          navigate(`/games/${result.game.id}/play`, { replace: true, state: { game: result.game } });
        } else {
          setWaitingTicket(result.ticket);
        }
      })
      .catch(setError);
  }, [connected, command, minutes, navigate, setWaitingTicket]);

  useEffect(() => {
    if (!matchedGame) return;
    completed.current = true;
    const game = matchedGame;
    clearMatchedGame();
    navigate(`/games/${game.id}/play`, { replace: true, state: { game } });
  }, [matchedGame, clearMatchedGame, navigate]);

  useEffect(() => () => {
    if (started.current && !completed.current) {
      command("matching:cancel", {}).catch(() => {});
      setWaitingTicket(null);
    }
  }, [command, setWaitingTicket]);

  async function cancel() {
    try {
      await command("matching:cancel", {});
    } catch (cancelError) {
      if (cancelError.code !== "MATCHMAKING_TICKET_NOT_FOUND") setError(cancelError);
    }
    completed.current = true;
    setWaitingTicket(null);
    navigate("/play", { replace: true });
  }

  return (
    <main className="matchmaking-page">
      <div className="search-orbit"><span className="orbit-piece">♞</span></div>
      <p className="eyebrow">{minutes} minute chess</p>
      <h1>{waitingTicket ? "Looking for an opponent" : connected ? "Joining the queue" : "Connecting to live play"}</h1>
      <p className="muted">This page owns the waiting state. Leaving it cancels the matchmaking ticket.</p>
      <ErrorMessage error={error} />
      <button className="button button-quiet" onClick={cancel}>Cancel and return to Play</button>
    </main>
  );
}
