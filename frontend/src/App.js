import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import { UserProvider, useUser } from "./UserContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import GamePage from "./pages/GamePage";

// Guards a route: redirects to "/" if the user is not logged in.
// If adminManagerOnly is true, regular "user" role is redirected to "/dashboard".
function ProtectedRoute({ children, adminManagerOnly = false }) {
  const { user } = useUser();
  if (!user) return <Navigate to="/" replace />;
  if (adminManagerOnly && user.userRole === "user") return <Navigate to="/dashboard" replace />;
  return children;
}

// Renders the Navbar only on protected pages (when a user is logged in).
// Footer is always rendered.
function AppRoutes() {
  const { user } = useUser();
  return (
    <>
      {user && <Navbar />}
      <main>
        <Routes>
          {/* Public route: redirect to dashboard if already logged in */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          {/* Admin and manager only */}
          <Route path="/users" element={<ProtectedRoute adminManagerOnly><UsersPage /></ProtectedRoute>} />

          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Dynamic game route — gameId comes from matchmaking response */}
          <Route path="/game/:gameId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />

          {/* Catch-all: redirect unknown paths to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    // UserProvider must wrap BrowserRouter so all route components can access user state
    <UserProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
