import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { getMe, logout } from "../services/usersApi";

// Persistent top navigation bar shown on all protected pages.
// Fetches the user's full name from the server on mount.
function Navbar() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");

  // Fetch the logged-in user's display name via GET /users/me
  useEffect(() => {
    if (!user) return;
    getMe({ userId: user.userId, userRole: user.userRole })
      .then((data) => setFullName(`${data.firstName} ${data.lastName}`))
      .catch(() => setFullName(`${user.firstName} ${user.lastName}`)); // fallback to context data
  }, [user]);

  // Calls the logout endpoint, clears the user context and redirects to login
  async function handleLogout() {
    try { await logout({ userId: user.userId, userRole: user.userRole }); } catch (_) {}
    setUser(null);
    navigate("/");
  }

  // "Users" link is only visible to admins and managers
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
        <span className="navbar-username">{fullName || "..."}</span>
        <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
