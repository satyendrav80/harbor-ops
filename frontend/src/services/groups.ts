import { apiFetch } from './apiClient';

export type GroupItem = {
  id: number;
  itemType: 'server' | 'service';
  itemId: number;
  server?: {
    id: number;
    name: string;
    publicIp: string;
    privateIp: string;
    sshPort: number;
  } | null;
  service?: {
    id: number;
    name: string;
    port: number;
    serverId: number;
    server: {
      id: number;
      name: string;
    };
  } | null;
};

export type Group = {
  id: number;
  name: string;
  createdAt: string;
  items?: GroupItem[];
  _count?: {
    items: number;
  };
};

export type GroupsResponse = {
  data: Group[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch all groups with pagination
 */
export async function getGroups(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<GroupsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  
  const query = queryParams.toString();
  return apiFetch<GroupsResponse>(`/groups${query ? `?${query}` : ''}`);
}

/**
 * Fetch a single group by ID with full item details
 */
export async function getGroup(id: number): Promise<Group> {
  return apiFetch<Group>(`/groups/${id}`);
}

/**
 * Create a new group
 */
export async function createGroup(data: { name: string }): Promise<Group> {
  return apiFetch<Group>('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a group
 */
export async function updateGroup(id: number, data: { name: string }): Promise<Group> {
  return apiFetch<Group>(`/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a group
 */
export async function deleteGroup(id: number): Promise<void> {
  return apiFetch<void>(`/groups/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Add item (server or service) to group
 */
export async function addItemToGroup(
  groupId: number,
  data: { itemType: 'server' | 'service'; itemId: number }
): Promise<GroupItem> {
  return apiFetch<GroupItem>(`/groups/${groupId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Remove item from group
 */
export async function removeItemFromGroup(groupId: number, itemId: number): Promise<void> {
  return apiFetch<void>(`/groups/${groupId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

