import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import LiveClient from "../services/live";

const LiveContext = createContext(null);

export function LiveProvider({ children }) {
  const { user, token } = useAuth();
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [waitingTicket, setWaitingTicket] = useState(null);
  const [matchedGame, setMatchedGame] = useState(null);
  const [gameEvents, setGameEvents] = useState({});

  useEffect(() => {
    if (!user || !token) return undefined;

    const client = new LiveClient(token);
    clientRef.current = client;
    client.on("connect", () => setConnected(true));
    client.on("disconnect", () => setConnected(false));
    client.on("matching:waiting", (response) => {
      if (response.success)
        setWaitingTicket(response.data.ticket);
    });
    client.on("matching:matched", (response) => {
      if (response.success) {
        setWaitingTicket(null);
        setMatchedGame(response.data.game);
      }
    });
    const saveGameEvent = (response) => {
      if (!response.success || !response.data?.game) return;
      const game = response.data.game;
      setGameEvents((events) => ({ ...events, [game.id]: game }));
    };
    client.on("game:updated", saveGameEvent);
    client.on("game:finished", saveGameEvent);
    client.connect()
      .then(() => {
        setConnected(true);
        setConnectionError("");
      })
      .catch((error) => {
        setConnected(false);
        setConnectionError(error.message);
      });

    return () => {
      client.disconnect();
      clientRef.current = null;
      setConnected(false);
    };
  }, [user, token]);

  const command = useCallback(function command(eventName, payload) {
    if (!clientRef.current) return Promise.reject(new Error("Live play is not connected."));
    return clientRef.current.command(eventName, payload);
  }, []);

  const clearMatchedGame = useCallback(function clearMatchedGame() {
    setMatchedGame(null);
  }, []);

  const clearGameEvent = useCallback(function clearGameEvent(gameId) {
    setGameEvents((events) => {
      const nextEvents = { ...events };
      delete nextEvents[gameId];
      return nextEvents;
    });
  }, []);

  return (
    <LiveContext.Provider value={{
      connected,
      connectionError,
      waitingTicket,
      setWaitingTicket,
      matchedGame,
      clearMatchedGame,
      gameEvents,
      clearGameEvent,
      command,
    }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  return useContext(LiveContext);
}
