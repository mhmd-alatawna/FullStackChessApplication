import { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { getSettings, updateSettings } from "../services/usersApi";

// Settings page — lets the logged-in user edit their profile fields.
// Loads current values from GET /settings and saves via PUT /settings.
function SettingsPage() {
  const { user, setUser } = useUser();

  // Form state mirrors the editable fields
  const [form, setForm] = useState({ firstName: "", lastName: "", userRole: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Populate the form with the user's current data on mount
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    getSettings({ userId: user.userId, userRole: user.userRole })
      .then((data) => {
        setForm({ firstName: data.firstName || "", lastName: data.lastName || "", userRole: data.userRole || "" });
        setIsLoading(false);
      })
      .catch((err) => { setError(err.message); setIsLoading(false); });
  }, [user]);

  // Keep form state in sync with input changes and reset the success banner
  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  }

  // Submit updated settings to the server and sync the UserContext
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      const auth = { userId: user.userId, userRole: user.userRole };
      const updated = await updateSettings(auth, form);
      // Update context so the Navbar name refreshes immediately
      setUser((prev) => ({ ...prev, firstName: updated.firstName, lastName: updated.lastName, userRole: updated.userRole }));
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="page-loading">Loading settings...</div>;

  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>
      <div className="settings-card">
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" name="firstName" type="text" value={form.firstName} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" name="lastName" type="text" value={form.lastName} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="userRole">Role</label>
            <select id="userRole" name="userRole" value={form.userRole} onChange={handleChange} className="form-input">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
            </select>
          </div>
          {error   && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">Settings saved successfully!</p>}
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SettingsPage;
