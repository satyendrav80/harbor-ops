/**
 * Parameter extraction utilities
 */

import type { RequestContext } from '../../../types/common';
import type { Filter, OrderByItem } from '../../../types/filterMetadata';

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

  const excludeReleaseNoteTasksRaw = body.excludeReleaseNoteTasks ?? query.excludeReleaseNoteTasks;
  const excludeReleaseNoteTasks =
    typeof excludeReleaseNoteTasksRaw === 'string'
      ? excludeReleaseNoteTasksRaw === 'true'
      : Boolean(excludeReleaseNoteTasksRaw);

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
    excludeReleaseNoteTasks,
    excludeReleaseNoteId: normalizedExcludeReleaseNoteId,
  };
}
