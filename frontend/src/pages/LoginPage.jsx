import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import { login } from "../services/usersApi";

function LoginPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!userId || isNaN(Number(userId))) { setError("Please enter a valid numeric User ID."); return; }
    if (!userRole) { setError("Please select a role."); return; }
    setIsLoading(true);
    try {
      const data = await login(Number(userId), userRole);
      if (data.userRole !== userRole) {
        setError(`Role mismatch: this account has role "${data.userRole}", not "${userRole}".`);
        setIsLoading(false);
        return;
      }
      setUser({ userId: data.userId, userRole: data.userRole, firstName: data.firstName, lastName: data.lastName });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-hero-section">
      {/* 8x8 chess board background */}
      <div className="login-hero-board" aria-hidden="true">
        {Array.from({ length: 64 }).map((_, i) => (
          <div key={i} className={`hero-sq ${(Math.floor(i / 8) + i) % 2 === 0 ? "hero-sq-light" : "hero-sq-dark"}`} />
        ))}
      </div>
      <div className="login-hero-overlay" />

      {/* Hero text */}
      <div className="login-hero-body">
        <div className="login-hero-pieces" aria-hidden="true">♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜</div>
        <h1 className="login-hero-title">PLAY ON<br />CHESS HUB</h1>
        <p className="login-hero-sub">The ultimate chess research &amp; play platform</p>
        <button className="btn login-hero-btn" onClick={() => setShowForm(true)}>
          Sign In
        </button>
        <div className="login-hero-stats">
          <div className="hero-stat"><span className="hero-stat-val">∞</span><span className="hero-stat-lbl">Games played</span></div>
          <div className="hero-stat"><span className="hero-stat-val">AI</span><span className="hero-stat-lbl">Powered engine</span></div>
          <div className="hero-stat"><span className="hero-stat-val">24/7</span><span className="hero-stat-lbl">Online matchmaking</span></div>
        </div>
      </div>

      {/* Modal form — appears on Sign In click */}
      {showForm && (
        <div className="login-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="login-card" onClick={(e) => e.stopPropagation()}>
            <div className="login-header">
              <span className="login-logo">♔</span>
              <h2 className="login-title">Sign In</h2>
              <p className="login-subtitle">Enter your credentials to continue</p>
            </div>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="userId">User ID</label>
                <input id="userId" type="number" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Enter your numeric User ID" className="form-input" min="1" autoFocus />
              </div>
              <div className="form-group">
                <label htmlFor="userRole">Role</label>
                <select id="userRole" value={userRole} onChange={(e) => setUserRole(e.target.value)} className="form-input">
                  <option value="">-- Select role --</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </select>
              </div>
              {error && <p className="error-msg">{error}</p>}
              <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
