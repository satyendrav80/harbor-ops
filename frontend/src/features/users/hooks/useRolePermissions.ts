import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignPermissionToRole, removePermissionFromRole } from '../../../services/users';
import { useAuth } from '../../../features/auth/context/AuthContext';

export function useAssignPermissionToRole() {
  const queryClient = useQueryClient();
  const { refreshPermissions } = useAuth();
  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      assignPermissionToRole(roleId, permissionId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['me'] }); // Refresh user permissions
      await refreshPermissions(); // Refresh permissions immediately
    },
  });
}

export function useRemovePermissionFromRole() {
  const queryClient = useQueryClient();
  const { refreshPermissions } = useAuth();
  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      removePermissionFromRole(roleId, permissionId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['me'] }); // Refresh user permissions
      await refreshPermissions(); // Refresh permissions immediately
    },
  });
}

