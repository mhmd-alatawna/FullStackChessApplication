import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { ErrorMessage, LoadingPage } from "../components/PageState";

export default function UsersPage() {
  const { user: actor } = useAuth();
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    api.getUsers().then(setUsers).catch(setError);
  }

  useEffect(load, []);

  async function createUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      await api.createUser({ firstName: fields.get("firstName").trim(), lastName: fields.get("lastName").trim(), email: fields.get("email").trim().toLowerCase(), password: fields.get("password"), role: fields.get("role") });
      form.reset();
      load();
    } catch (createError) {
      setError(createError);
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const profile = { firstName: fields.get("firstName").trim(), lastName: fields.get("lastName").trim(), email: fields.get("email").trim().toLowerCase(), theme: editing.theme || "dark" };
    if (fields.get("password")) profile.password = fields.get("password");
    try {
      await api.updateUser(editing.id, profile);
      const role = fields.get("role");
      if (role && role !== editing.role) await api.changeRole(editing.id, role);
      setEditing(null);
      load();
    } catch (saveError) {
      setError(saveError);
    }
  }

  async function deleteUser(id) {
    if (!window.confirm(`Delete user ${id}? Users with game history cannot be deleted.`)) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (deleteError) {
      setError(deleteError);
    }
  }

  if (!users && !error) return <LoadingPage message="Loading users…" />;
  const createRoles = actor.role === "admin" ? ["user", "manager", "admin"] : ["user", "manager"];

  return (
    <main className="page">
      <header className="page-heading"><div><p className="eyebrow">Management</p><h1>Users</h1><p>Profile edits persist immediately. Admin role boundaries remain enforced by the backend.</p></div></header>
      <ErrorMessage error={error} />
      <div className="management-layout">
        <form className="panel form-panel" onSubmit={createUser}>
          <h2>Create user</h2>
          <label>First name<input name="firstName" required /></label><label>Last name<input name="lastName" required /></label><label>Email<input name="email" type="email" required /></label><label>Password<input name="password" type="password" minLength="6" required /></label>
          <label>Role<select name="role">{createRoles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <button className="button button-primary" type="submit">Create user</button>
        </form>
        <section className="panel table-panel">
          <table><thead><tr><th>Name</th><th>Role</th><th>Elo</th><th>Record</th><th /></tr></thead><tbody>
            {users?.map((user) => <tr key={user.id}><td><strong>{user.firstName} {user.lastName}</strong><small>{user.id}{user.isAutomated ? " · agent" : ""}</small></td><td>{user.role}</td><td>{user.elo}</td><td>{user.wins} / {user.losses} / {user.draws}</td><td><div className="row-actions">{!user.isAutomated && <button className="button button-small button-quiet" onClick={() => setEditing(user)}>Edit</button>}{actor.role === "admin" && !user.isAutomated && actor.id !== user.id && <button className="button button-small button-danger" onClick={() => deleteUser(user.id)}>Delete</button>}</div></td></tr>)}
          </tbody></table>
        </section>
      </div>
      {editing && <div className="dialog-backdrop" onMouseDown={() => setEditing(null)}><form className="dialog" onSubmit={saveUser} onMouseDown={(event) => event.stopPropagation()}><h2>Edit {editing.firstName} {editing.lastName}</h2><div className="two-fields"><label>First name<input name="firstName" defaultValue={editing.firstName} required /></label><label>Last name<input name="lastName" defaultValue={editing.lastName} required /></label></div><label>Email<input name="email" type="email" defaultValue={editing.email || ""} required /></label><label>New password <small>optional</small><input name="password" type="password" /></label>{actor.role === "admin" && editing.role !== "admin" && <label>Role<select name="role" defaultValue={editing.role}><option value="user">user</option><option value="manager">manager</option></select></label>}<div className="dialog-actions"><button className="button button-quiet" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" type="submit">Save</button></div></form></div>}
    </main>
  );
}
