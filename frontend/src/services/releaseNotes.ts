import { apiFetch } from './apiClient';

export type ReleaseNote = {
  id: number;
  serviceId: number;
  note: string;
  status: 'pending' | 'deployment_started' | 'deployed';
  publishDate: string;
  deployedAt?: string | null;
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
  service?: {
    id: number;
    name: string;
    port: number;
  };
  tasks?: Array<{
    id: number;
    task: {
      id: number;
      title: string;
      description?: string | null;
      status: string;
      type: string;
      sprint?: {
        id: number;
        name: string;
        status: string;
      } | null;
    };
  }>;
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
  status?: 'pending' | 'deployed' | 'deployment_started',
  serviceId?: number
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
  if (serviceId) {
    params.append('serviceId', serviceId.toString());
  }
  return apiFetch<ReleaseNotesResponse>(`/release-notes?${params.toString()}`);
}

/**
 * Create a release note for a service
 */
export async function createReleaseNote(
  serviceId: number, 
  note: string, 
  publishDate?: string,
  taskIds?: number[]
): Promise<ReleaseNote> {
  return apiFetch<ReleaseNote>('/release-notes', {
    method: 'POST',
    body: JSON.stringify({ serviceId, note, publishDate, taskIds }),
  });
}

/**
 * Update a release note (only if pending)
 */
export async function updateReleaseNote(
  id: number, 
  note?: string, 
  publishDate?: string, 
  serviceId?: number,
  taskIds?: number[]
): Promise<ReleaseNote> {
  return apiFetch<ReleaseNote>(`/release-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ note, publishDate, serviceId, taskIds }),
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

/**
 * Mark a release note as deployment started
 */
export async function markReleaseNoteDeploymentStarted(id: number): Promise<ReleaseNote> {
  return apiFetch<ReleaseNote>(`/release-notes/${id}/mark-deployment-started`, {
    method: 'POST',
  });
}

/**
 * Delete a release note (only if pending)
 */
export async function deleteReleaseNote(id: number): Promise<void> {
  return apiFetch<void>(`/release-notes/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Advanced filtering endpoint
 * POST /release-notes/list
 */
export async function listReleaseNotesAdvanced(request: {
  filters?: any;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: any;
}): Promise<ReleaseNotesResponse> {
  return apiFetch<ReleaseNotesResponse>('/release-notes/list', {
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
 * Get a single release note by ID
 */
export async function getReleaseNote(id: number): Promise<ReleaseNote> {
  return apiFetch<ReleaseNote>(`/release-notes/${id}`);
}

/**
 * Get filter metadata
 * GET /release-notes/filter-metadata
 */
export async function getReleaseNotesFilterMetadata(): Promise<any> {
  return apiFetch<any>('/release-notes/filter-metadata');
}

export type ReleaseNoteShareLink = {
  id: string;
  shareToken: string;
  filters?: any;
  expiresAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
  viewCount: number;
  lastViewedAt?: string | null;
};

/**
 * Create a public share link
 */
export async function createReleaseNoteShareLink(
  filters?: any,
  expiresInDays?: number | null
): Promise<ReleaseNoteShareLink> {
  return apiFetch<ReleaseNoteShareLink>('/release-notes/share-links', {
    method: 'POST',
    body: JSON.stringify({ filters, expiresInDays }),
  });
}

/**
 * Get user's share links
 */
export async function getReleaseNoteShareLinks(): Promise<ReleaseNoteShareLink[]> {
  return apiFetch<ReleaseNoteShareLink[]>('/release-notes/share-links');
}

/**
 * Delete a share link
 */
export async function deleteReleaseNoteShareLink(id: string): Promise<void> {
  return apiFetch<void>(`/release-notes/share-links/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get public release notes via share token (no auth required)
 */
export async function getPublicReleaseNotes(token: string): Promise<{
  shareLink: {
    id: string;
    createdAt: string;
    expiresAt?: string | null;
    viewCount: number;
  };
  data: ReleaseNote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  return apiFetch(`/release-notes/public/${token}`, {
    method: 'GET',
    skipAuth: true, // Public endpoint, no auth required
  });
}

