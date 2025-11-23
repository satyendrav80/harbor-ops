/**
 * Search where clause building utilities
 */

/**
 * Build search where clause for credential name and type
 */
export function buildSearchWhere(search?: string): any {
  if (!search) {
    return {};
  }
  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { type: { contains: search, mode: 'insensitive' } },
    ],
  };
}

