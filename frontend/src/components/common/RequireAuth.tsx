import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';

/**
 * RequireAuth wrapper component that redirects unauthenticated users to login
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

