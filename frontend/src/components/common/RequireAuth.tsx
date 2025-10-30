import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';

/**
 * RequireAuth wrapper component that redirects unauthenticated users to login
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

