/**
 * Search where clause building utilities
 */

/**
 * Build search where clause for task title and description
 */
export function buildSearchWhere(search?: string): any {
  if (!search) {
    return {};
  }
  return {
    OR: [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ],
  };
}
