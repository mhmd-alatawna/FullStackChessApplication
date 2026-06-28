import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { ErrorMessage } from "../components/PageState";
import validation from "../services/validation";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const profile = { };
    profile.firstName = fields.get("firstName").trim()
    profile.lastName = fields.get("lastName").trim()
    profile.password = fields.get("password").trim();

    if (profile.password !== null && profile.password !== "")
      if (!validation.validatePassword(profile.password, setError)) {
        return;
      }

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await api.updateMe(profile);
      setUser(updated);
      setSaved(true);
      if (event.currentTarget != null)
        event.currentTarget.elements.password.value = "";
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <header className="page-heading"><div><p className="eyebrow">Account</p><h1>Your profile</h1><p>Changes update the shared session view immediately on every page.</p></div></header>
      <div className="profile-layout">
        <section className="profile-card">
          <div className="profile-avatar">{user.firstName[0]}{user.lastName[0]}</div>
          <h2>{user.firstName} {user.lastName}</h2><p>{user.role} · player {user.id}</p>
          <div className="profile-stats"><span><strong>{user.elo}</strong>Elo</span><span><strong>{user.wins}</strong>Wins</span><span><strong>{user.losses}</strong>Losses</span><span><strong>{user.draws}</strong>Draws</span></div>
        </section>
        <form className="panel form-panel" onSubmit={submit}>
          <h2>Edit account</h2>
          <p className="muted">Your first and last name are also your login name.</p>
          <div className="two-fields"><label>First name<input name="firstName" defaultValue={user.firstName} required /></label><label>Last name<input name="lastName" defaultValue={user.lastName} required /></label></div>
          <label>New password <small>optional</small><input name="password" type="password" autoComplete="new-password" /></label>
          <ErrorMessage error={error} />
          {saved && <div className="message message-success"><strong>Saved</strong><span>Your profile is up to date.</span></div>}
          <button className="button button-primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save profile"}</button>
        </form>
      </div>
    </main>
  );
}
