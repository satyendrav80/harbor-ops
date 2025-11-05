import { apiFetch } from './apiClient';

export type UserWithRoles = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  status: 'pending' | 'approved' | 'blocked' | 'rejected';
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
  tags?: Array<{
    id: number;
    name: string;
    value?: string | null;
    color?: string | null;
  }>;
};

export type RoleWithPermissions = {
  id: string;
  name: string;
  system?: boolean;
  permissions: Array<{
    permission: {
      id: string;
      name: string;
      resource?: string;
      action?: string;
      description?: string | null;
      system?: boolean;
    };
  }>;
  users: Array<{
    user: {
      id: string;
      email: string;
      username: string | null;
      name: string | null;
    };
  }>;
};

export type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  system?: boolean;
};

export type PermissionConfig = { 
  resources: string[]; 
  actions: string[]; // All possible actions (backwards compatibility)
  resourceActions?: Record<string, string[]>; // Map of resource -> [actions] for resource-specific filtering
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch users with pagination and search
 */
export async function getUsers(page: number = 1, limit: number = 20, search: string = ''): Promise<PaginatedResponse<UserWithRoles>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) {
    params.append('search', search);
  }
  return apiFetch<PaginatedResponse<UserWithRoles>>(`/users?${params.toString()}`);
}

/**
 * Fetch a single user by ID with roles
 */
export async function getUser(id: string): Promise<UserWithRoles> {
  return apiFetch<UserWithRoles>(`/users/${id}`);
}

/**
 * Fetch roles with pagination and search
 */
export async function getRoles(page: number = 1, limit: number = 20, search: string = ''): Promise<PaginatedResponse<RoleWithPermissions>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) {
    params.append('search', search);
  }
  return apiFetch<PaginatedResponse<RoleWithPermissions>>(`/roles?${params.toString()}`);
}

/**
 * Fetch all permissions
 */
export async function getPermissions(): Promise<Permission[]> {
  return apiFetch<Permission[]>('/permissions');
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(userId: string, roleId: string): Promise<UserWithRoles> {
  return apiFetch<UserWithRoles>(`/users/${userId}/roles/${roleId}`, {
    method: 'POST',
  });
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  return apiFetch<void>(`/users/${userId}/roles/${roleId}`, {
    method: 'DELETE',
  });
}

/**
 * Create a new role
 */
export async function createRole(name: string): Promise<RoleWithPermissions> {
  return apiFetch<RoleWithPermissions>('/roles', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Assign a permission to a role
 */
export async function assignPermissionToRole(roleId: string, permissionId: string): Promise<RoleWithPermissions> {
  return apiFetch<RoleWithPermissions>(`/roles/${roleId}/permissions/${permissionId}`, {
    method: 'POST',
  });
}

/**
 * Remove a permission from a role
 */
export async function removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
  return apiFetch<void>(`/roles/${roleId}/permissions/${permissionId}`, {
    method: 'DELETE',
  });
}

/**
 * Create a new user
 */
export async function createUser(data: { email: string; password: string; name?: string; username?: string; tagIds?: number[] }): Promise<UserWithRoles> {
  return apiFetch<UserWithRoles>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a user
 */
export async function updateUser(id: string, data: { email?: string; name?: string; username?: string; password?: string; tagIds?: number[] }): Promise<UserWithRoles> {
  return apiFetch<UserWithRoles>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/users/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Update a role
 */
export async function updateRole(id: string, name: string): Promise<RoleWithPermissions> {
  return apiFetch<RoleWithPermissions>(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

/**
 * Delete a role
 */
export async function deleteRole(id: string): Promise<void> {
  return apiFetch<void>(`/roles/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Create a new permission
 */
export async function createPermission(data: { name: string; resource: string; action: string; description?: string }): Promise<Permission> {
  return apiFetch<Permission>('/permissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a permission
 */
export async function updatePermission(id: string, data: { name: string; resource: string; action: string; description?: string }): Promise<Permission> {
  return apiFetch<Permission>(`/permissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a permission
 */
export async function deletePermission(id: string): Promise<void> {
  return apiFetch<void>(`/permissions/${id}`, {
    method: 'DELETE',
  });
}

export async function getPermissionConfig(): Promise<PermissionConfig> {
  return apiFetch<PermissionConfig>('/permission-config');
}

/**
 * Approve a user
 */
export async function approveUser(id: string): Promise<UserWithRoles> {
  return apiFetch<UserWithRoles>(`/users/${id}/approve`, {
    method: 'POST',
  });
}

/**
 * Block a user
 */
export async function blockUser(id: string): Promise<UserWithRoles> {
  return apiFetch<UserWithRoles>(`/users/${id}/block`, {
    method: 'POST',
  });
}

/**
 * Unblock a user
 */
export async function unblockUser(id: string): Promise<UserWithRoles> {
  return apiFetch<UserWithRoles>(`/users/${id}/unblock`, {
    method: 'POST',
  });
}

/**
 * Reject a user (delete pending user)
 */
export async function rejectUser(id: string): Promise<void> {
  return apiFetch<void>(`/users/${id}/reject`, {
    method: 'DELETE',
  });
}

