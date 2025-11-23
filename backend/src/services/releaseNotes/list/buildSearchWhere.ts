/**
 * Search where clause building utilities
 */

/**
 * Build search where clause for note content
 */
export function buildSearchWhere(search?: string): any {
  if (!search) {
    return {};
  }
  return {
    note: { contains: search, mode: 'insensitive' },
  };
}

