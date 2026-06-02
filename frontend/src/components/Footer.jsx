// Simple footer rendered on every page (including the login page).
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <span className="footer-logo">♟</span>
        <span className="footer-name">Chess Hub</span>
        <span className="footer-sep">|</span>
        <span className="footer-desc">A chess platform and AI research environment</span>
        <span className="footer-sep">|</span>
        {/* Dynamic year — no need to update manually */}
        <span className="footer-year">&copy; {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}

export default Footer;
