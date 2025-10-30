import { apiFetch } from './apiClient';

export type Service = {
  id: number;
  name: string;
  port: number;
  serverId: number;
  credentialId?: number;
  createdAt: string;
};

/**
 * Fetch all services
 */
export async function getServices(): Promise<Service[]> {
  return apiFetch<Service[]>('/services');
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
export async function createService(data: Omit<Service, 'id' | 'createdAt'>): Promise<Service> {
  return apiFetch<Service>('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a service
 */
export async function updateService(id: number, data: Partial<Omit<Service, 'id' | 'createdAt'>>): Promise<Service> {
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

