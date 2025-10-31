import { apiFetch } from './apiClient';

export type Credential = {
  id: number;
  name: string;
  type: string;
  data: Record<string, string>; // Changed from string to object (key-value pairs)
  createdAt: string;
  servers?: Array<{
    server: {
      id: number;
      name: string;
      type: string;
    };
  }>;
  services?: Array<{
    service: {
      id: number;
      name: string;
      port: number;
    };
  }>;
};

export type CredentialsResponse = {
  data: Credential[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch all credentials (returns paginated response)
 */
export async function getCredentials(): Promise<Credential[]> {
  const response = await apiFetch<CredentialsResponse>('/credentials?limit=1000');
  return response.data;
}

/**
 * Fetch a single credential by ID
 */
export async function getCredential(id: number): Promise<Credential> {
  return apiFetch<Credential>(`/credentials/${id}`);
}

/**
 * Create a new credential
 */
export async function createCredential(data: Omit<Credential, 'id' | 'createdAt'>): Promise<Credential> {
  return apiFetch<Credential>('/credentials', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a credential
 */
export async function updateCredential(id: number, data: Partial<Omit<Credential, 'id' | 'createdAt'>>): Promise<Credential> {
  return apiFetch<Credential>(`/credentials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a credential
 */
export async function deleteCredential(id: number): Promise<void> {
  return apiFetch<void>(`/credentials/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Reveal credential data (requires credentials:reveal permission)
 */
export async function revealCredentialData(id: number): Promise<{ data: any }> {
  return apiFetch<{ data: any }>(`/credentials/${id}/reveal`);
}

