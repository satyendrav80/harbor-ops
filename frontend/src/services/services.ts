import { apiFetch } from './apiClient';
import type { Server } from './servers';
import type { Credential } from './credentials';

export type ServiceDependency = {
  id: number;
  serviceId: number;
  dependencyServiceId?: number | null;
  dependencyService?: {
    id: number;
    name: string;
    port: number;
  } | null;
  externalServiceName?: string | null;
  externalServiceType?: string | null;
  externalServiceUrl?: string | null;
  description?: string | null;
  createdAt: string;
};

export type Service = {
  id: number;
  name: string;
  port: number;
  sourceRepo?: string | null;
  appId?: string | null;
  functionName?: string | null;
  deploymentUrl?: string | null;
  documentationUrl?: string | null;
  documentation?: string | null;
  metadata?: any | null;
  createdAt: string;
  servers?: Array<{
    server: Server;
  }>;
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
  dependencies?: ServiceDependency[];
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
export async function getServices(
  page?: number,
  limit?: number,
  search?: string,
  serviceId?: number,
  serverId?: number
): Promise<ServicesResponse> {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  if (search) params.append('search', search);
  if (serviceId) params.append('serviceId', serviceId.toString());
  if (serverId) params.append('serverId', serverId.toString());
  params.append('include', 'relations');
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
export async function createService(data: Omit<Service, 'id' | 'createdAt' | 'servers' | 'credentials' | 'domains'> & { serverIds: number[]; credentialIds?: number[]; domainIds?: number[] }): Promise<Service> {
  return apiFetch<Service>('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a service
 */
export async function updateService(id: number, data: Partial<Omit<Service, 'id' | 'createdAt' | 'servers' | 'credentials' | 'domains'>> & { serverIds?: number[]; credentialIds?: number[]; domainIds?: number[] }): Promise<Service> {
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

/**
 * Add a service dependency
 */
export async function addServiceDependency(
  serviceId: number,
  data: {
    dependencyServiceId?: number;
    externalServiceName?: string;
    externalServiceType?: string;
    externalServiceUrl?: string;
    description?: string;
  }
): Promise<ServiceDependency> {
  return apiFetch<ServiceDependency>(`/services/${serviceId}/dependencies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Remove a service dependency
 */
export async function removeServiceDependency(serviceId: number, dependencyId: number): Promise<void> {
  return apiFetch<void>(`/services/${serviceId}/dependencies/${dependencyId}`, {
    method: 'DELETE',
  });
}

