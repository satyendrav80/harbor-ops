/* Purpose: Application routes + protected sections */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ProfilePage from './pages/ProfilePage';
import Dashboard from './pages/Dashboard';
import ServersList from './pages/servers/ServersList';
import ServicesList from './pages/services/ServicesList';
import CredentialsList from './pages/credentials/CredentialsList';
import TagsList from './pages/tags/TagsList';
import ReleaseNotesDashboard from './pages/releasenotes/ReleaseNotesDashboard';
import AppShell from './components/layout/AppShell';
import { useAuth } from './state/AuthContext';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function ShellPage({ children }: { children: JSX.Element }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ShellPage><ProfilePage /></ShellPage>
          </RequireAuth>
        }
      />
      <Route
        path="/servers"
        element={
          <RequireAuth>
            <ShellPage><ServersList /></ShellPage>
          </RequireAuth>
        }
      />
      <Route
        path="/services"
        element={
          <RequireAuth>
            <ShellPage><ServicesList /></ShellPage>
          </RequireAuth>
        }
      />
      <Route
        path="/credentials"
        element={
          <RequireAuth>
            <ShellPage><CredentialsList /></ShellPage>
          </RequireAuth>
        }
      />
      <Route
        path="/tags"
        element={
          <RequireAuth>
            <ShellPage><TagsList /></ShellPage>
          </RequireAuth>
        }
      />
      <Route
        path="/release-notes"
        element={
          <RequireAuth>
            <ShellPage><ReleaseNotesDashboard /></ShellPage>
          </RequireAuth>
        }
      />
      <Route path="/" element={token ? <ShellPage><Dashboard /></ShellPage> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
    </Routes>
  );
}
