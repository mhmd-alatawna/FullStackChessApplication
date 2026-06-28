import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLive } from "../context/LiveContext";
import api from "../services/api";
import ChessBoard from "../components/ChessBoard";
import ChessPiece from "../components/ChessPiece";
import CapturedMaterial, { calculateCapturedMaterial } from "../components/CapturedMaterial";
import PlayerClock from "../components/PlayerClock";
import { ErrorMessage, LoadingPage } from "../components/PageState";
import { gameLabel, isFinished } from "../components/GameCard";

export default function GamePage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, command, gameEvents, clearGameEvent } = useLive();
  const [game, setGame] = useState(location.state?.game || null);
  const [joined, setJoined] = useState(false);
  const [legalMoves, setLegalMoves] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const color = useMemo(() => {
    if (!game) return null;
    if (game.whitePlayerId === user.id) return "white";
    if (game.blackPlayerId === user.id) return "black";
    return null;
  }, [game, user.id]);

  useEffect(() => {
    let active = true;
    api.getGame(gameId)
      .then((loadedGame) => {
        if (!active) return;
        if (isFinished(loadedGame)) {
          navigate(`/games/${gameId}/result`, { replace: true, state: { game: loadedGame } });
          return;
        }
        setGame(loadedGame);
      })
      .catch((loadError) => active && setError(loadError));
    return () => { active = false; };
  }, [gameId, navigate]);

  useEffect(() => {
    if (!connected) {
      setJoined(false);
      return;
    }
    command("game:join", { gameId })
      .then((joinedGame) => {
        if (isFinished(joinedGame)) {
          navigate(`/games/${gameId}/result`, { replace: true, state: { game: joinedGame } });
          return;
        }
        setGame(joinedGame);
        setJoined(true);
        setError(null);
      })
      .catch(setError);
  }, [connected, command, gameId, navigate]);

  useEffect(() => {
    const eventGame = gameEvents[gameId];
    if (!eventGame) return;
    clearGameEvent(gameId);
    if (isFinished(eventGame)) {
      navigate(`/games/${gameId}/result`, { replace: true, state: { game: eventGame } });
      return;
    }
    setGame(eventGame);
  }, [gameEvents, gameId, clearGameEvent, navigate]);

  useEffect(() => {
    if (!game || !joined || game.currentPlayerId !== user.id) {
      setLegalMoves([]);
      return;
    }
    command("game:legal-moves", { gameId })
      .then(setLegalMoves)
      .catch((movesError) => {
        setLegalMoves([]);
        if (movesError.code !== "NOT_PLAYER_TURN") setError(movesError);
      });
  }, [game, joined, user.id, command, gameId]);

  async function makeMove(from, to, promotion = null) {
    setPendingPromotion(null);
    setSubmitting(true);
    setError(null);
    try {
      const result = await command("game:move", {
        gameId,
        from,
        to,
        ...(promotion ? { promotion } : {}),
      });
      if (isFinished(result.game)) {
        navigate(`/games/${gameId}/result`, { replace: true, state: { game: result.game } });
      } else {
        setGame(result.game);
      }
    } catch (moveError) {
      setError(moveError);
    } finally {
      setSubmitting(false);
    }
  }

  async function resign() {
    if (!window.confirm("Resign this game? The game will end immediately.")) return;
    setSubmitting(true);
    try {
      const finishedGame = await command("game:resign", { gameId });
      navigate(`/games/${gameId}/result`, { replace: true, state: { game: finishedGame } });
    } catch (resignError) {
      setError(resignError);
      setSubmitting(false);
    }
  }

  if (!game && !error) return <LoadingPage message="Loading game…" />;
  if (!game) return <main className="page"><ErrorMessage error={error} /></main>;

  const orientation = color || "white";
  const topColor = orientation === "white" ? "black" : "white";
  const topId = topColor === "white" ? game.whitePlayerId : game.blackPlayerId;
  const bottomId = orientation === "white" ? game.whitePlayerId : game.blackPlayerId;
  const topName = topColor === "white" ? game.whitePlayerName : game.blackPlayerName;
  const bottomName = orientation === "white" ? game.whitePlayerName : game.blackPlayerName;
  const canMove = joined && !submitting && !pendingPromotion && game.currentPlayerId === user.id;
  const capturedMaterial = calculateCapturedMaterial(game.moves);

  return (
    <main className="page game-page">
      <header className="page-heading compact-heading">
        <div><p className="eyebrow">Game {game.id.slice(0, 8)}</p><h1>{gameLabel(game)}</h1><p>{color ? `You are ${color}` : "Observing this game"}</p></div>
        <span className={`connection-indicator ${joined ? "connected" : ""}`}>{joined ? "Live board" : "Read only"}</span>
      </header>
      <ErrorMessage error={error} />
      <div className="game-layout">
        <section className="board-column">
          <PlayerBar id={topId} name={topName} color={topColor} game={game} selfId={user.id} material={capturedMaterial[topColor]} />
          <ChessBoard
            fen={game.fen}
            legalMoves={legalMoves}
            orientation={orientation}
            lastMove={game.moves.at(-1)}
            canMove={canMove}
            onMove={makeMove}
            onPromotion={(from, to) => setPendingPromotion({ from, to })}
          />
          <PlayerBar id={bottomId} name={bottomName} color={orientation} game={game} selfId={user.id} material={capturedMaterial[orientation]} />
        </section>
        <aside className="game-sidebar">
          <section className="panel move-panel">
            <div className="panel-heading"><h2>Moves</h2><span>{game.ply} ply</span></div>
            <MoveList moves={game.moves} />
          </section>
          <section className="panel game-controls">
            <button className="button button-danger button-block" disabled={!color || !joined || submitting} onClick={resign}>Resign game</button>
          </section>
        </aside>
      </div>
      {pendingPromotion && (
        <PromotionDialog
          color={color}
          onCancel={() => setPendingPromotion(null)}
          onSelect={(piece) => makeMove(pendingPromotion.from, pendingPromotion.to, piece)}
        />
      )}
    </main>
  );
}

function PromotionDialog({ color, onSelect, onCancel }) {
  const pieces = [
    { value: "q", name: "Queen" },
    { value: "r", name: "Rook" },
    { value: "b", name: "Bishop" },
    { value: "n", name: "Knight" },
  ];

  return (
    <div className="promotion-backdrop" role="presentation">
      <section className="promotion-dialog" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
        <p className="eyebrow">Pawn promotion</p>
        <h2 id="promotion-title">Choose a piece</h2>
        <div className="promotion-options">
          {pieces.map((piece) => (
            <button className="promotion-option" key={piece.value} onClick={() => onSelect(piece.value)} type="button">
              <ChessPiece type={piece.value} color={color} />
              <span>{piece.name}</span>
            </button>
          ))}
        </div>
        <button className="button button-quiet" onClick={onCancel} type="button">Cancel</button>
      </section>
    </div>
  );
}

function PlayerBar({ id, name, color, game, selfId, material }) {
  return (
    <div className="player-bar">
      <div className="player-identity">
        <span className={`color-token ${color}-token`} />
        <span className="player-details">
          <span><strong>{id === selfId ? `${name || "You"} (you)` : name || "Opponent"}</strong><small>{color}{game.currentPlayerId === id ? " · to move" : ""}</small></span>
          <CapturedMaterial pieces={material.pieces} playerColor={color} advantage={material.advantage} />
        </span>
      </div>
      <PlayerClock game={game} color={color} />
    </div>
  );
}

function MoveList({ moves }) {
  if (!moves.length) return <p className="muted move-placeholder">No moves yet.</p>;
  const rows = [];
  for (let index = 0; index < moves.length; index += 2) {
    rows.push(<div className="move-row" key={index}><span>{index / 2 + 1}.</span><strong>{moves[index]?.san}</strong><strong>{moves[index + 1]?.san || ""}</strong></div>);
  }
  return <div className="move-list">{rows}</div>;
}
