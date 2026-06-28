import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return <main className="page centered-state"><span className="large-piece">♙</span><h1>Page not found</h1><p>The route does not describe a Chess Grove page.</p><Link className="button button-primary" to="/play">Return to Play</Link></main>;
}
