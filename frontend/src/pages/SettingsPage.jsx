import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { ErrorMessage, LoadingPage } from "../components/PageState";
import validation from "../services/validation";

const emptyForm = { firstName: "", lastName: "", email: "", theme: "dark" };

function validate(form, setError) {
  let firstName = form.firstName.trim()
  let lastName = form.lastName.trim()
  let email = form.email.trim().toLowerCase()
  let theme = form.theme

  if (!validation.validateFirstAndLastName(firstName, lastName, setError))
    return false;
  if (!validation.validateEmail(email, setError))
    return false ;
  if (!validation.validateTheme(theme, setError))
    return false ;
  return true;
}

export default function SettingsPage() {
  const { setUser } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then((settings) => setForm({
        firstName: settings.firstName || "",
        lastName: settings.lastName || "",
        email: settings.email || "",
        theme: settings.theme || "dark",
      }))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setSaved(false);
  }

  async function submit(event) {
    event.preventDefault();
    const result = validate(form, setError);
    if (!result) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await api.updateSettings({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        theme: form.theme,
      });
      setUser(updated);
      setForm({ firstName: updated.firstName, lastName: updated.lastName, email: updated.email, theme: updated.theme });
      setSaved(true);
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingPage message="Loading settings…" />;

  return (
    <main className="page settings-page">
      <header className="page-heading"><div><p className="eyebrow">Preferences</p><h1>Settings</h1><p>These values are loaded and saved through the backend settings API.</p></div></header>
      <form className="panel settings-form" onSubmit={submit} noValidate>
        <div className="two-fields"><label>First name<input name="firstName" value={form.firstName} onChange={change} required /></label><label>Last name<input name="lastName" value={form.lastName} onChange={change} required /></label></div>
        <label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label>
        <label>Theme<select name="theme" value={form.theme} onChange={change}><option value="dark">Dark</option><option value="light">Light</option></select></label>
        <ErrorMessage error={error} />
        {saved && <div className="message message-success" role="status"><strong>Saved</strong><span>Your settings were updated successfully.</span></div>}
        <button className="button button-primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save settings"}</button>
      </form>
    </main>
  );
}
