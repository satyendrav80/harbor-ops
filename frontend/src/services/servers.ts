import { apiFetch } from './apiClient';

export type Server = {
  id: number;
  name: string;
  publicIp: string;
  privateIp: string;
  sshPort: number;
  username: string;
  password?: string;
  createdAt: string;
};

/**
 * Fetch all servers
 */
export async function getServers(): Promise<Server[]> {
  return apiFetch<Server[]>('/servers');
}

/**
 * Fetch a single server by ID
 */
export async function getServer(id: number): Promise<Server> {
  return apiFetch<Server>(`/servers/${id}`);
}

/**
 * Create a new server
 */
export async function createServer(data: Omit<Server, 'id' | 'createdAt'>): Promise<Server> {
  return apiFetch<Server>('/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a server
 */
export async function updateServer(id: number, data: Partial<Omit<Server, 'id' | 'createdAt'>>): Promise<Server> {
  return apiFetch<Server>(`/servers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a server
 */
export async function deleteServer(id: number): Promise<void> {
  return apiFetch<void>(`/servers/${id}`, {
    method: 'DELETE',
  });
}

