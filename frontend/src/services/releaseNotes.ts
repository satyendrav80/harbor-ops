import { apiFetch } from './apiClient';

export type ReleaseNote = {
  id: number;
  serviceId: number;
  note: string;
  status: 'pending' | 'deployed';
  createdAt: string;
  updatedAt?: string;
  service?: {
    id: number;
    name: string;
    port: number;
  };
};

export type ReleaseNotesResponse = {
  data: ReleaseNote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch all release notes (paginated)
 */
export async function getReleaseNotes(
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: 'pending' | 'deployed'
): Promise<ReleaseNotesResponse> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (search) {
    params.append('search', search);
  }
  if (status) {
    params.append('status', status);
  }
  return apiFetch<ReleaseNotesResponse>(`/release-notes?${params.toString()}`);
}

/**
 * Create a release note for a service
 */
export async function createReleaseNote(serviceId: number, note: string): Promise<ReleaseNote> {
  return apiFetch<ReleaseNote>(`/release-notes/services/${serviceId}/release-notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

/**
 * Update a release note (only if pending)
 */
export async function updateReleaseNote(id: number, note: string): Promise<ReleaseNote> {
  return apiFetch<ReleaseNote>(`/release-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ note }),
  });
}

/**
 * Mark a release note as deployed
 */
export async function markReleaseNoteDeployed(id: number): Promise<ReleaseNote> {
  return apiFetch<ReleaseNote>(`/release-notes/${id}/mark-deployed`, {
    method: 'POST',
  });
}

