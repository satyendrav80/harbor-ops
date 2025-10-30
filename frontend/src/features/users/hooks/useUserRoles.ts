import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignRoleToUser, removeRoleFromUser } from '../../../services/users';
import { useAuth } from '../../../features/auth/context/AuthContext';

export function useAssignRoleToUser() {
  const queryClient = useQueryClient();
  const { refreshPermissions, user } = useAuth();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignRoleToUser(userId, roleId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['me'] }); // Refresh user permissions
      // If assigning role to current user, refresh permissions immediately
      if (user?.id === userId) {
        await refreshPermissions();
      }
    },
  });
}

export function useRemoveRoleFromUser() {
  const queryClient = useQueryClient();
  const { refreshPermissions, user } = useAuth();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      removeRoleFromUser(userId, roleId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['me'] }); // Refresh user permissions
      // If removing role from current user, refresh permissions immediately
      if (user?.id === userId) {
        await refreshPermissions();
      }
    },
  });
}

