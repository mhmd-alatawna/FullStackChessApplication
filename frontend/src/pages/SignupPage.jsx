import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorMessage } from "../components/PageState";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const firstName = String(fields.get("firstName") || "").trim();
    const lastName = String(fields.get("lastName") || "").trim();
    const email = String(fields.get("email") || "").trim().toLowerCase();
    const password = String(fields.get("password") || "");
    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      const validationError = new Error("Enter a name, valid email, and password of at least 6 characters.");
      validationError.code = "VALIDATION_ERROR";
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signup(firstName, lastName, email, password);
      navigate("/dashboard", { replace: true });
    } catch (signupError) {
      setError(signupError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-introduction">
        <span className="auth-knight">♟</span>
        <p className="eyebrow">Start at 1200 Elo</p>
        <h1>Your board<br />is ready.</h1>
        <p>Create one account for matchmaking, automated games, history, and statistics.</p>
      </section>
      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit} noValidate>
          <div><p className="eyebrow">Create account</p><h2>Join Chess Grove</h2></div>
          <div className="two-fields"><label>First name<input name="firstName" required /></label><label>Last name<input name="lastName" required /></label></div>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="new-password" minLength="6" required /></label>
          <ErrorMessage error={error} />
          <button className="button button-primary button-block" disabled={submitting} type="submit">{submitting ? "Creating account…" : "Create account"}</button>
          <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
        </form>
      </section>
    </main>
  );
}
