/**
 * Parameter extraction utilities
 */

import type { ReleaseStatus } from '@prisma/client';
import type { RequestContext } from '../../../types/common';
import type { Filter, OrderByItem } from '../../../types/filterMetadata';

const RELEASE_NOTE_STATUS_SET = new Set<ReleaseStatus>(['pending', 'deployment_started', 'deployed']);

function normalizeReleaseNoteStatuses(value: unknown): ReleaseStatus[] | undefined {
  if (!value) return undefined;

  const rawValues = Array.isArray(value) ? value : [value];
  const normalized = rawValues
    .map((status) => (typeof status === 'string' ? status.trim() : null))
    .filter((status): status is ReleaseStatus => !!status && RELEASE_NOTE_STATUS_SET.has(status as ReleaseStatus));

  if (normalized.length === 0) {
    return undefined;
  }

  return Array.from(new Set(normalized));
}

/**
 * Extract and validate parameters from request context
 */
export function extractParams(context: RequestContext) {
  const body = context.body || {};
  const query = context.query || {};

  // Extract from body (POST request)
  // Support both new nested structure and legacy flat array
  const filters: Filter | Filter[] = body.filters || [];
  const search = body.search?.trim() || undefined;
  const page = Math.max(1, parseInt(body.page) || parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(body.limit) || parseInt(query.limit) || 20)); // Limit max to 1000
  
  // Support both new array format and legacy single object format for orderBy
  const orderBy = body.orderBy || { key: 'createdAt', direction: 'desc' as const };

  const excludeReleaseNoteStatuses = normalizeReleaseNoteStatuses(
    body.excludeReleaseNoteStatuses ?? query.excludeReleaseNoteStatuses
  );

  const excludeReleaseNoteIdRaw = body.excludeReleaseNoteId ?? query.excludeReleaseNoteId;
  const excludeReleaseNoteId =
    excludeReleaseNoteIdRaw !== undefined && excludeReleaseNoteIdRaw !== null
      ? Number(excludeReleaseNoteIdRaw)
      : undefined;
  const normalizedExcludeReleaseNoteId =
    typeof excludeReleaseNoteId === 'number' && Number.isFinite(excludeReleaseNoteId) && excludeReleaseNoteId > 0
      ? excludeReleaseNoteId
      : undefined;

  return {
    filters,
    search,
    page,
    limit,
    orderBy,
    excludeReleaseNoteStatuses,
    excludeReleaseNoteId: normalizedExcludeReleaseNoteId,
  };
}
