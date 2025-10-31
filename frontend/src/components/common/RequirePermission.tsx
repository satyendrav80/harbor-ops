import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';

/**
 * RequirePermission wrapper component that conditionally renders children based on permission
 */
export function RequirePermission({ permission, children, redirectTo }: { permission: string; children: React.ReactNode; redirectTo?: string }) {
  const { hasPermission, token } = useAuth();
  
  // If not authenticated, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // If no permission, redirect to profile (always accessible) or specified route
  if (!hasPermission(permission)) {
    return <Navigate to={redirectTo || '/profile'} replace />;
  }
  
  return <>{children}</>;
}

