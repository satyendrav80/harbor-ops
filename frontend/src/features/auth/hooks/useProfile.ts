import { useQuery } from '@tanstack/react-query';
import { getMe } from '../../../services/auth';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to fetch and refresh user profile including permissions
 */
export function useProfile() {
  const { login } = useAuth();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const me = await getMe();
      // Update auth context with latest permissions
      if (me.permissions) {
        login(localStorage.getItem('token') || '', {
          id: me.id,
          name: me.name || me.email,
          email: me.email,
          permissions: me.permissions,
        });
      }
      return me;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to refresh user permissions after role/permission changes
 */
export function useRefreshPermissions() {
  const { login } = useAuth();
  return async () => {
    const me = await getMe();
    if (me.permissions) {
      login(localStorage.getItem('token') || '', {
        id: me.id,
        name: me.name || me.email,
        email: me.email,
        permissions: me.permissions,
      });
    }
  };
}

