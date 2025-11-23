/**
 * Search where clause building utilities
 */

/**
 * Build search where clause for service name, port, and related server info
 */
export function buildSearchWhere(search?: string): any {
  if (!search) {
    return {};
  }
  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      ...(isNaN(Number(search)) ? [] : [{ port: { equals: Number(search) } }]),
      {
        servers: {
          some: {
            server: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { publicIp: { contains: search, mode: 'insensitive' } },
                { privateIp: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      },
    ],
  };
}

