const backendUrl = (process.env.REACT_APP_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

const config = {
  apiUrl: `${backendUrl}/api`,
  socketUrl: backendUrl,
  frontendPort: 5173,
  socketTimeoutMs: 120000,
  projectName: "Chess Project",
  projectYear: 2026,
  projectDescription: "Play thoughtfully. Improve every game.",
};

export default config;
