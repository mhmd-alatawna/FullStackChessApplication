import config from "../config";

export default function Footer() {
  return (
    <footer className="main-footer">
      <strong>{config.projectName}</strong>
      <span>{config.projectDescription}</span>
      <span>© {config.projectYear}</span>
    </footer>
  );
}
