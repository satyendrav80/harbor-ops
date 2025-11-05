import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createGroup,
  updateGroup,
  deleteGroup,
  addItemToGroup,
  removeItemFromGroup,
  Group,
  GroupItem,
} from '../../../services/groups';

/**
 * Hook for creating a new group
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation<Group, Error, { name: string }>({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/**
 * Hook for updating a group
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation<Group, Error, { id: number; name: string }>({
    mutationFn: ({ id, name }) => updateGroup(id, { name }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', data.id] });
    },
  });
}

/**
 * Hook for deleting a group
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/**
 * Hook for adding an item (server, service, credential, domain, or user) to a group
 */
export function useAddItemToGroup() {
  const queryClient = useQueryClient();

  return useMutation<
    GroupItem,
    Error,
    { groupId: number; itemType: 'server' | 'service' | 'credential' | 'domain' | 'user'; itemId: number | string }
  >({
    mutationFn: ({ groupId, itemType, itemId }) => addItemToGroup(groupId, { itemType, itemId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.itemType, variables.itemId] });
    },
  });
}

/**
 * Hook for removing an item from a group
 */
export function useRemoveItemFromGroup() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { groupId: number; itemId: number | string }>({
    mutationFn: ({ groupId, itemId }) => removeItemFromGroup(groupId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] });
    },
  });
}

