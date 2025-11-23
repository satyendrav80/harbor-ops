import { apiFetch } from './apiClient';

export type Domain = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
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
  tags?: Array<{
    id: number;
    name: string;
    value?: string | null;
    color?: string | null;
  }>;
};

export type DomainsResponse = {
  data: Domain[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch all domains (returns paginated response)
 */
export async function getDomains(page?: number, limit?: number, search?: string): Promise<DomainsResponse> {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  if (search) params.append('search', search);
  return apiFetch<DomainsResponse>(`/domains?${params.toString()}`);
}

/**
 * Fetch a single domain by ID
 */
export async function getDomain(id: number): Promise<Domain> {
  return apiFetch<Domain>(`/domains/${id}`);
}

/**
 * Create a new domain
 */
export async function createDomain(data: Omit<Domain, 'id' | 'createdAt' | 'updatedAt'> & { tagIds?: number[] }): Promise<Domain> {
  return apiFetch<Domain>('/domains', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a domain
 */
export async function updateDomain(id: number, data: Partial<Omit<Domain, 'id' | 'createdAt' | 'updatedAt'>> & { tagIds?: number[] }): Promise<Domain> {
  return apiFetch<Domain>(`/domains/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a domain
 */
export async function deleteDomain(id: number): Promise<void> {
  return apiFetch<void>(`/domains/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get domains for a specific server or service
 */
export async function getDomainsByItem(itemType: 'server' | 'service', itemId: number): Promise<number[]> {
  return apiFetch<number[]>(`/domains/by-item/${itemType}/${itemId}`);
}

/**
 * List domains with advanced filtering
 */
export async function listDomainsAdvanced(request: {
  filters?: any;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: any;
}): Promise<DomainsResponse> {
  return apiFetch<DomainsResponse>('/domains/list', {
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
 * GET /domains/filter-metadata
 */
export async function getDomainsFilterMetadata(): Promise<any> {
  return apiFetch<any>('/domains/filter-metadata');
}

