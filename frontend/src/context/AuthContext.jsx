import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.token) {
      setLoading(false);
      return;
    }
    api.getMe()
      .then(setUser)
      .catch(() => api.setToken(""))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = user?.theme || "dark";
  }, [user?.theme]);

  async function login(email, password) {
    const result = await api.login(email, password);
    api.setToken(result.token);
    setUser(result.user);
    return result.user;
  }

  async function signup(firstName, lastName, email, password) {
    const result = await api.signup(firstName, lastName, email, password);
    api.setToken(result.token);
    setUser(result.user);
    return result.user;
  }

  const logout = useCallback(async function logout() {
    try {
      if (api.token) await api.logout();
    } finally {
      api.setToken("");
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async function refreshUser() {
    const currentUser = await api.getMe();
    setUser(currentUser);
    return currentUser;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, setUser, token: api.token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
