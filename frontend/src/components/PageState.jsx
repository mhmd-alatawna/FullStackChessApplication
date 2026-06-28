export function LoadingPage({ message = "Loading…" }) {
  return <main className="page centered-state"><div className="spinner" /><p>{message}</p></main>;
}

export function ErrorMessage({ error }) {
  if (!error) return null;
  return <div className="message message-error"><strong>{error.code || "ERROR"}</strong><span>{error.message}</span></div>;
}

export function EmptyState({ title, children }) {
  return <div className="empty-state"><span>♙</span><h2>{title}</h2><p>{children}</p></div>;
}
