import { apiFetch } from './apiClient';

export type ReleaseNote = {
  id: number;
  serviceId: number;
  note: string;
  status: 'pending' | 'deployed';
  createdAt: string;
};

/**
 * Fetch all release notes
 */
export async function getReleaseNotes(status?: 'pending' | 'deployed'): Promise<ReleaseNote[]> {
  const url = status ? `/release-notes?status=${status}` : '/release-notes';
  return apiFetch<ReleaseNote[]>(url);
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

