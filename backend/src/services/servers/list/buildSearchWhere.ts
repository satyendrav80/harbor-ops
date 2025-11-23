/**
 * Search where clause building utilities
 */

/**
 * Build search where clause for server name, IPs, and username
 */
export function buildSearchWhere(search?: string): any {
  if (!search) {
    return {};
  }
  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { publicIp: { contains: search, mode: 'insensitive' } },
      { privateIp: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ],
  };
}

