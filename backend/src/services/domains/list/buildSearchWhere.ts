/**
 * Search where clause building utilities
 */

/**
 * Build search where clause for domain name
 */
export function buildSearchWhere(search?: string): any {
  if (!search) {
    return {};
  }
  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
    ],
  };
}

