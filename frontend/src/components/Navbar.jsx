import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { getMe, logout } from "../services/usersApi";

function Navbar() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    async function fetchName() {
      try {
        const data = await getMe({ userId: user.userId, userRole: user.userRole });
        setFullName(`${data.firstName} ${data.lastName}`);
      } catch (err) {
        setError(err.message);
        // fallback: use whatever is already in context
        setFullName(`${user.firstName} ${user.lastName}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchName();
  }, [user]);

  async function handleLogout() {
    try { await logout({ userId: user.userId, userRole: user.userRole }); } catch (_) {}
    setUser(null);
    navigate("/");
  }

  const isAdminOrManager = user?.userRole === "admin" || user?.userRole === "manager";

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">♔</span>
        <span className="navbar-title">Chess Hub</span>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        {isAdminOrManager && <Link to="/users" className="nav-link">Users</Link>}
        <Link to="/settings" className="nav-link">Settings</Link>
      </div>
      <div className="navbar-user">
        {isLoading
          ? <span className="navbar-username navbar-loading">Loading...</span>
          : <span className="navbar-username" title={error || undefined}>{fullName}</span>
        }
        <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
