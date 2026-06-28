import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLive } from "../context/LiveContext";
import api from "../services/api";
import GameCard from "../components/GameCard";
import { ErrorMessage } from "../components/PageState";

const times = [1, 3, 5, 10, 15, 30];

export default function PlayPage() {
  const { user } = useAuth();
  const { connected, connectionError, command } = useLive();
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [games, setGames] = useState([]);
  const [humanMinutes, setHumanMinutes] = useState(10);
  const [agentMinutes, setAgentMinutes] = useState(10);
  const [agentId, setAgentId] = useState("");
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([api.getAgents(), api.getMyGames()])
      .then(([availableAgents, myGames]) => {
        setAgents(availableAgents);
        setAgentId(availableAgents[0]?.id || "");
        setGames(myGames.slice().reverse().slice(0, 3));
      })
      .catch(setError);
  }, []);

  function findHuman() {
    navigate(`/matchmaking?minutes=${humanMinutes}`);
  }

  async function playAgent() {
    setStarting(true);
    setError(null);
    try {
      const result = await command("agent:join", { durationMinutes: agentMinutes, agentId });
      navigate(`/games/${result.game.id}/play`, { state: { game: result.game } });
    } catch (startError) {
      setError(startError);
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="page">
      <header className="page-heading play-heading">
        <div><p className="eyebrow">Welcome, {user.firstName}</p><h1>Choose your next game</h1><p>One clear starting point for both matchmaking paths.</p></div>
        <div className="rating-card"><span>Your rating</span><strong>{user.elo}</strong></div>
      </header>
      {!connected && <div className="message message-warning"><strong>Live play is offline</strong><span>{connectionError || "Waiting for the backend connection."}</span></div>}
      <ErrorMessage error={error} />
      <section className="choice-grid">
        <article className="play-choice human-choice">
          <div className="choice-symbol">♟</div><p className="eyebrow">Human opponent</p><h2>Find a match</h2><p>Enter the queue. You will only match someone who selected the same clock.</p>
          <label>Time per player<select value={humanMinutes} onChange={(event) => setHumanMinutes(Number(event.target.value))}>{times.map((time) => <option value={time} key={time}>{time} minutes</option>)}</select></label>
          <button className="button button-primary button-block" disabled={!connected} onClick={findHuman}>Enter matchmaking</button>
        </article>
        <article className="play-choice agent-choice">
          <div className="choice-symbol">♞</div><p className="eyebrow">Automated opponent</p><h2>Play immediately</h2><p>Choose a configured strategy. Agent games use the same board and result flow.</p>
          <div className="two-fields">
            <label>Opponent<select value={agentId} onChange={(event) => setAgentId(event.target.value)}>{agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.name} · {agent.difficulty}</option>)}</select></label>
            <label>Time<select value={agentMinutes} onChange={(event) => setAgentMinutes(Number(event.target.value))}>{times.map((time) => <option value={time} key={time}>{time} minutes</option>)}</select></label>
          </div>
          <button className="button button-primary button-block" disabled={!connected || !agentId || starting} onClick={playAgent}>{starting ? "Creating game…" : "Play agent"}</button>
        </article>
      </section>
      <section className="content-section">
        <div className="section-heading"><div><h2>Recent games</h2><p>Continue active games or open their result page.</p></div><button className="button button-quiet" onClick={() => navigate("/games")}>All games</button></div>
        <div className="game-card-grid">{games.map((game) => <GameCard game={game} key={game.id} />)}{games.length === 0 && <p className="muted">No games yet.</p>}</div>
      </section>
    </main>
  );
}
