import { NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLive } from "../context/LiveContext";
import config from "../config";

export default function Navbar() {
  const { user, logout, refreshUser } = useAuth();
  const { connected } = useLive();
  const navigate = useNavigate();
  const manages = user.role === "manager" || user.role === "admin";

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="main-header">
      <NavLink className="brand" to="/dashboard"><span className="brand-icon">♞</span>{config.projectName}</NavLink>
      <nav className="main-navigation" aria-label="Main navigation">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/play">Play</NavLink>
        <NavLink to="/games">My games</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <NavLink to="/profile">Profile</NavLink>
        {manages && <NavLink to="/management/users">Users</NavLink>}
        {manages && <NavLink to="/management/games">All games</NavLink>}
      </nav>
      <div className="header-account">
        <span className={`connection-indicator ${connected ? "connected" : ""}`}>{connected ? "Live" : "Offline"}</span>
        <span><strong>{user.firstName} {user.lastName}</strong><small>{user.role} · {user.elo} Elo</small></span>
        <button className="button button-quiet" onClick={handleLogout}>Log out</button>
      </div>
    </header>
  );
}
