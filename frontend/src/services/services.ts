import { apiFetch } from './apiClient';
import type { Server } from './servers';
import type { Credential } from './credentials';

export type Service = {
  id: number;
  name: string;
  port: number;
  serverId: number;
  credentialId?: number | null;
  sourceRepo?: string | null;
  appId?: string | null;
  functionName?: string | null;
  deploymentUrl?: string | null;
  metadata?: any | null;
  createdAt: string;
  server?: Server;
  credential?: Credential | null;
};

export type ServicesResponse = {
  data: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch all services (returns paginated response)
 */
export async function getServices(page?: number, limit?: number, search?: string): Promise<ServicesResponse> {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  if (search) params.append('search', search);
  return apiFetch<ServicesResponse>(`/services?${params.toString()}`);
}

/**
 * Fetch services with relations
 */
export async function getServicesWithRelations(): Promise<Service[]> {
  return apiFetch<Service[]>('/services?include=relations');
}

/**
 * Fetch a single service by ID
 */
export async function getService(id: number): Promise<Service> {
  return apiFetch<Service>(`/services/${id}`);
}

/**
 * Create a new service
 */
export async function createService(data: Omit<Service, 'id' | 'createdAt' | 'server' | 'credential'>): Promise<Service> {
  return apiFetch<Service>('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a service
 */
export async function updateService(id: number, data: Partial<Omit<Service, 'id' | 'createdAt' | 'server' | 'credential'>>): Promise<Service> {
  return apiFetch<Service>(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a service
 */
export async function deleteService(id: number): Promise<void> {
  return apiFetch<void>(`/services/${id}`, {
    method: 'DELETE',
  });
}

