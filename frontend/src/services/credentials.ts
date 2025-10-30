import { apiFetch } from './apiClient';

export type Credential = {
  id: number;
  name: string;
  type: string;
  data: string;
  createdAt: string;
};

/**
 * Fetch all credentials
 */
export async function getCredentials(): Promise<Credential[]> {
  return apiFetch<Credential[]>('/credentials');
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

