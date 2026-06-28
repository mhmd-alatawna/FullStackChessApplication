import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LiveProvider } from "./context/LiveContext";
import AppLayout from "./components/AppLayout";
import { LoadingPage } from "./components/PageState";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import PlayPage from "./pages/PlayPage";
import MatchmakingPage from "./pages/MatchmakingPage";
import GamePage from "./pages/GamePage";
import GameResultPage from "./pages/GameResultPage";
import GamesPage from "./pages/GamesPage";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import ManageGamesPage from "./pages/ManageGamesPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./styles.css";

function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage message="Restoring session…" />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function Authenticated() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage message="Restoring session…" />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function ManagersOnly() {
  const { user } = useAuth();
  return user.role === "manager" || user.role === "admin" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function ApplicationRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      <Route element={<Authenticated />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/matchmaking" element={<MatchmakingPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/:gameId/play" element={<GamePage />} />
          <Route path="/games/:gameId/result" element={<GameResultPage />} />
          <Route element={<ManagersOnly />}>
            <Route path="/management/users" element={<UsersPage />} />
            <Route path="/management/games" element={<ManageGamesPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (<AuthProvider>
            <LiveProvider>
              <BrowserRouter>
                <ApplicationRoutes />
              </BrowserRouter>
            </LiveProvider>
          </AuthProvider>);
}
