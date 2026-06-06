import { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { getSettings, updateSettings, getAllUsers, createUser, updateUser, deleteUser } from "../services/usersApi";

// ── helpers ──────────────────────────────────────────────────────────────────

function PersonalSettings({ user, setUser }) {
  const [form, setForm] = useState({ firstName: "", lastName: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    async function fetchSettings() {
      try {
        const data = await getSettings({ userId: user.userId, userRole: user.userRole });
        setForm({ firstName: data.firstName || "", lastName: data.lastName || "" });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [user]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
      if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    }
    setIsSaving(true);
    try {
      const auth = { userId: user.userId, userRole: user.userRole };
      const payload = { firstName: form.firstName, lastName: form.lastName, ...(newPassword ? { password: newPassword } : {}) };
      const updated = await updateSettings(auth, payload);
      setUser((prev) => ({ ...prev, firstName: updated.firstName, lastName: updated.lastName }));
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="page-loading">Loading settings...</div>;

  return (
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
        <label htmlFor="newPassword">New Password</label>
        <input id="newPassword" type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setSuccess(false); }} className="form-input" placeholder="Leave blank to keep current password" autoComplete="new-password" />
      </div>
      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setSuccess(false); }} className="form-input" placeholder="Repeat new password" autoComplete="new-password" />
      </div>
      {error   && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">Settings saved successfully!</p>}
      <button type="submit" className="btn btn-primary" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}

// ── Create User form ──────────────────────────────────────────────────────────

function CreateUserForm({ auth }) {
  const EMPTY = { firstName: "", lastName: "", email: "", password: "", userRole: "user" };
  const [form, setForm] = useState(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.firstName || !form.lastName) { setError("First and last name are required."); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Enter a valid email address."); return; }
    if (form.password && form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setIsSaving(true);
    try {
      const data = await createUser(auth, { firstName: form.firstName, lastName: form.lastName, userRole: form.userRole, email: form.email || null, password: form.password || null });
      setSuccess(`User created! New user ID: ${data.userId}`);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="settings-form">
      <div className="admin-form-row">
        <div className="form-group">
          <label>First Name</label>
          <input name="firstName" type="text" value={form.firstName} onChange={handleChange} className="form-input" placeholder="First name" />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input name="lastName" type="text" value={form.lastName} onChange={handleChange} className="form-input" placeholder="Last name" />
        </div>
      </div>
      <div className="admin-form-row">
        <div className="form-group">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className="form-input" placeholder="user@example.com" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} className="form-input" placeholder="Min. 6 characters" autoComplete="new-password" />
        </div>
      </div>
      <div className="form-group">
        <label>Role</label>
        <select name="userRole" value={form.userRole} onChange={handleChange} className="form-input">
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error   && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">{success}</p>}
      <button type="submit" className="btn btn-primary" disabled={isSaving}>
        {isSaving ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}

// ── Manage User Roles ─────────────────────────────────────────────────────────

function ManageRoles({ auth }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  // per-user state: { [userId]: { role, saving, error, success, deleting } }
  const [rowState, setRowState] = useState({});

  useEffect(() => {
    setIsLoading(true);
    setFetchError(null);
    async function fetchUsers() {
      try {
        const data = await getAllUsers(auth);
        setUsers(data);
        const initial = {};
        data.forEach((u) => { initial[u.userId] = { role: u.userRole, saving: false, error: null, success: false, deleting: false }; });
        setRowState(initial);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, []);

  function handleRoleChange(userId, newRole) {
    setRowState((prev) => ({ ...prev, [userId]: { ...prev[userId], role: newRole, success: false, error: null } }));
  }

  async function handleDelete(userId) {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    setRowState((prev) => ({ ...prev, [userId]: { ...prev[userId], deleting: true, error: null, success: false } }));
    try {
      await deleteUser(auth, userId);
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (err) {
      setRowState((prev) => ({ ...prev, [userId]: { ...prev[userId], deleting: false, error: err.message } }));
    }
  }

  async function handleUpdate(u) {
    setRowState((prev) => ({ ...prev, [u.userId]: { ...prev[u.userId], saving: true, error: null, success: false } }));
    try {
      await updateUser(auth, u.userId, { firstName: u.firstName, lastName: u.lastName, userRole: rowState[u.userId].role });
      setRowState((prev) => ({ ...prev, [u.userId]: { ...prev[u.userId], saving: false, success: true } }));
    } catch (err) {
      setRowState((prev) => ({ ...prev, [u.userId]: { ...prev[u.userId], saving: false, error: err.message } }));
    }
  }

  if (isLoading) return <p className="page-loading" style={{padding:"1rem"}}>Loading users...</p>;
  if (fetchError) return <p className="error-msg">{fetchError}</p>;

  return (
    <div className="manage-roles-list">
      {users.map((u) => {
        const rs = rowState[u.userId] || {};
        return (
          <div key={u.userId} className="manage-roles-row">
            <div className="manage-roles-info">
              <span className="manage-roles-name">{u.firstName} {u.lastName}</span>
              <span className="manage-roles-email">{u.email || <em>no email</em>}</span>
            </div>
            <div className="manage-roles-controls">
              <select
                value={rs.role || u.userRole}
                onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                className="form-input manage-roles-select"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button
                className="btn btn-primary manage-roles-btn"
                disabled={rs.saving || rs.deleting}
                onClick={() => handleUpdate(u)}
              >
                {rs.saving ? "..." : "Update"}
              </button>
              <button
                className="btn btn-danger manage-roles-btn"
                disabled={rs.saving || rs.deleting}
                onClick={() => handleDelete(u.userId)}
              >
                {rs.deleting ? "..." : "Delete"}
              </button>
            </div>
            {rs.error   && <p className="error-msg manage-roles-feedback">{rs.error}</p>}
            {rs.success && <p className="success-msg manage-roles-feedback">Updated!</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function SettingsPage() {
  const { user, setUser } = useUser();
  const auth = { userId: user.userId, userRole: user.userRole };
  const isAdmin = user.userRole === "admin";

  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>

      {/* Section 1 — Personal Settings */}
      <div className="settings-card">
        <h2 className="settings-section-title">Personal Settings</h2>
        <PersonalSettings user={user} setUser={setUser} />
      </div>

      {/* Section 2 — Admin Panel (admin only) */}
      {isAdmin && (
        <>
          <div className="settings-card admin-panel">
            <h2 className="settings-section-title admin-section-title">
              <span className="admin-badge">Admin</span> Create New User
            </h2>
            <CreateUserForm auth={auth} />
          </div>

          <div className="settings-card admin-panel">
            <h2 className="settings-section-title admin-section-title">
              <span className="admin-badge">Admin</span> Manage User Roles
            </h2>
            <ManageRoles auth={auth} />
          </div>
        </>
      )}
    </div>
  );
}

export default SettingsPage;
