import { useAuth } from '../../features/auth/context/AuthContext';

/**
 * RequirePermission wrapper component that conditionally renders children based on permission
 */
export function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return null;
  return <>{children}</>;
}

