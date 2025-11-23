import { apiFetch } from './apiClient';
import type { ServerType } from './constants';

export type Server = {
  id: number;
  name: string;
  type: ServerType;
  publicIp?: string | null;
  privateIp?: string | null;
  endpoint?: string | null;
  port?: number | null;
  sshPort?: number | null;
  username?: string | null;
  password?: string;
  documentationUrl?: string | null;
  documentation?: string | null;
  credentials?: Array<{
    credential: {
      id: number;
      name: string;
      type: string;
    };
  }>;
  domains?: Array<{
    domain: {
      id: number;
      name: string;
    };
  }>;
  tags?: Array<{
    tag: {
      id: number;
      name: string;
      value: string | null;
      color: string | null;
    };
  }>;
  services?: Array<{
    service: {
      id: number;
      name: string;
      port: number;
    };
  }>;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdByUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  updatedByUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

export type ServersResponse = {
  data: Server[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch all servers (returns paginated response)
 */
export async function getServers(): Promise<ServersResponse> {
  return apiFetch<ServersResponse>('/servers?limit=1000');
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
export async function createServer(data: Omit<Server, 'id' | 'createdAt' | 'tags' | 'credentials' | 'domains'> & { credentialIds?: number[]; domainIds?: number[] }): Promise<Server> {
  return apiFetch<Server>('/servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a server
 */
export async function updateServer(id: number, data: Partial<Omit<Server, 'id' | 'createdAt' | 'tags' | 'credentials' | 'domains'>> & { credentialIds?: number[]; domainIds?: number[] }): Promise<Server> {
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

/**
 * Reveal server password (requires credentials:reveal permission)
 */
export async function revealServerPassword(id: number): Promise<{ password: string | null }> {
  return apiFetch<{ password: string | null }>(`/servers/${id}/reveal-password`);
}

/**
 * Advanced filtering endpoint
 * POST /servers/list
 */
export async function listServersAdvanced(request: {
  filters?: any;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: any;
}): Promise<ServersResponse> {
  return apiFetch<ServersResponse>('/servers/list', {
    method: 'POST',
    body: JSON.stringify({
      filters: request.filters,
      search: request.search,
      page: request.page || 1,
      limit: request.limit || 20,
      orderBy: request.orderBy,
    }),
  });
}

/**
 * Get filter metadata
 * GET /servers/filter-metadata
 */
export async function getServersFilterMetadata(): Promise<any> {
  return apiFetch<any>('/servers/filter-metadata');
}

