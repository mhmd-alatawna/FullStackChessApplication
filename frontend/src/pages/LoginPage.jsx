import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorMessage } from "../components/PageState";
import config from "../config";
import validation from "../services/validation";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") || "").trim().toLowerCase();
    const password = String(fields.get("password") || "");
    if (!validation.validateEmail(email,setError)) {
      return;
    }
    if (!validation.validatePassword(password,setError)) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-introduction">
        <span className="auth-knight">♞</span>
        <p className="eyebrow">{config.projectName}</p>
        <h1>Find the move.<br />Enjoy the game.</h1>
        <p>Live chess, thoughtful automated opponents, and a complete history of your progress.</p>
      </section>
      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <div><p className="eyebrow">Welcome back</p><h2>Log in</h2><p className="muted">Use your registered email and password.</p></div>
          <label>Email<input name="email" type="email" autoComplete="email" placeholder="player@chessgrove.local" required autoFocus /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" minLength="6" required /></label>
          <ErrorMessage error={error} />
          <button className="button button-primary button-block" disabled={submitting} type="submit">{submitting ? "Logging in…" : "Log in"}</button>
          <p className="auth-switch">New here? <Link to="/signup">Create an account</Link></p>
          <div className="demo-accounts"><strong>Development accounts</strong><span>admin@chessgrove.local / admin123</span><span>manager@chessgrove.local / manager123</span><span>player@chessgrove.local / player123</span></div>
        </form>
      </section>
    </main>
  );
}
