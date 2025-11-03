import { Router } from 'express';
import { PrismaClient, ReleaseStatus } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

/**
 * GET /dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', requirePermission('dashboard:view'), async (_req, res) => {
  try {
    const [totalServers, totalServices, totalCredentials, totalTags, pendingReleaseNotes] = await Promise.all([
      prisma.server.count({ where: { deleted: false } }),
      prisma.service.count({ where: { deleted: false } }),
      prisma.credential.count({ where: { deleted: false } }),
      prisma.tag.count({ where: { deleted: false } }),
      prisma.releaseNote.count({
        where: { status: ReleaseStatus.pending },
      }),
    ]);

    res.json({
      totalServers,
      activeServices: totalServices,
      totalCredentials,
      totalTags,
      pendingReleaseNotes,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * GET /dashboard/server-status
 * Get server status counts (online, warning, offline)
 * 
 * TODO: Implement actual server health monitoring
 * Expected response structure:
 * {
 *   total: number;      // Total number of servers
 *   online: number;     // Number of servers with healthy status
 *   warning: number;    // Number of servers with warning status
 *   offline: number;    // Number of servers with offline/down status
 * }
 * 
 * Implementation ideas:
 * - Store server health status in database with periodic health checks
 * - Use ping/SSH connection tests to determine server status
 * - Integrate with monitoring tools (Nagios, Prometheus, etc.)
 * - Store last health check timestamp and status in server table or separate health_check table
 */
router.get('/server-status', requirePermission('dashboard:view'), async (_req, res) => {
  try {
    // TODO: Implement actual server status monitoring
    // For now, return empty/null to indicate no data available
    res.json(null);
  } catch (error) {
    console.error('Error fetching server status:', error);
    res.status(500).json({ error: 'Failed to fetch server status' });
  }
});

/**
 * GET /dashboard/service-health
 * Get service health status
 * 
 * TODO: Implement actual service health monitoring
 * Expected response structure:
 * [
 *   {
 *     id: number;        // Service ID
 *     name: string;      // Service name
 *     health: number;    // Health percentage (0-100)
 *   },
 *   ...
 * ]
 * 
 * Implementation ideas:
 * - Monitor service endpoints with HTTP health checks
 * - Track response times, error rates, availability
 * - Store health metrics in database (service_health table)
 * - Integrate with APM tools (New Relic, Datadog, etc.)
 * - Calculate health based on uptime, response time, error rate
 */
router.get('/service-health', requirePermission('dashboard:view'), async (_req, res) => {
  try {
    // TODO: Implement actual service health monitoring
    // For now, return empty array to indicate no data available
    res.json([]);
  } catch (error) {
    console.error('Error fetching service health:', error);
    res.status(500).json({ error: 'Failed to fetch service health' });
  }
});

/**
 * GET /dashboard/recent-alerts
 * Get recent alerts/activity
 * 
 * TODO: Implement actual alerting system
 * Expected response structure:
 * [
 *   {
 *     id: number;                    // Alert ID
 *     timestamp: string;              // Human-readable time ago (e.g., "10m ago", "1h ago")
 *     item: string;                   // Item name (server, service, credential, etc.)
 *     status: 'high' | 'degraded' | 'expiring' | 'recovered';  // Alert status
 *     action?: string;                // Optional action label (e.g., "Renew", "Details")
 *   },
 *   ...
 * ]
 * 
 * Implementation ideas:
 * - Monitor servers/services for critical issues (CPU, memory, disk, uptime)
 * - Track credential expiration dates and alert when expiring
 * - Monitor service response times and error rates
 * - Store alerts in database (alerts table)
 * - Integrate with monitoring/alerting tools (PagerDuty, Opsgenie, etc.)
 * - Create alerts for: server down, high CPU/memory, service errors, credential expiry
 */
router.get('/recent-alerts', requirePermission('dashboard:view'), async (_req, res) => {
  try {
    // TODO: Implement actual alerting system
    // For now, return empty array to indicate no data available
    res.json([]);
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    res.status(500).json({ error: 'Failed to fetch recent alerts' });
  }
});

/**
 * GET /dashboard/search
 * Quick search across servers, services, credentials, and domains
 */
router.get('/search', requirePermission('dashboard:view'), async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);

    if (!query || query.length < 2) {
      return res.json({
        servers: [],
        services: [],
        credentials: [],
        domains: [],
      });
    }

    const searchPattern = { contains: query, mode: 'insensitive' as const };

    const [servers, services, credentials, domains] = await Promise.all([
      prisma.server.findMany({
        where: {
          deleted: false,
          OR: [
            { name: searchPattern },
            { publicIp: searchPattern },
            { privateIp: searchPattern },
          ],
        },
        select: {
          id: true,
          name: true,
          publicIp: true,
        },
        take: limit,
      }),
      prisma.service.findMany({
        where: {
          deleted: false,
          OR: [
            { name: searchPattern },
            ...(isNaN(Number(query)) ? [] : [{ port: { equals: Number(query) } }]),
          ],
        },
        select: {
          id: true,
          name: true,
          port: true,
        },
        take: limit,
      }),
      prisma.credential.findMany({
        where: {
          deleted: false,
          name: searchPattern,
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
        take: limit,
      }),
      prisma.domain.findMany({
        where: {
          deleted: false,
          name: searchPattern,
        },
        select: {
          id: true,
          name: true,
        },
        take: limit,
      }),
    ]);

    res.json({
      servers: servers.map((s) => ({
        id: s.id,
        name: s.name,
        type: 'server',
        subtitle: s.publicIp,
      })),
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        type: 'service',
        subtitle: `Port: ${s.port}`,
      })),
      credentials: credentials.map((c) => ({
        id: c.id,
        name: c.name,
        type: 'credential',
        subtitle: c.type,
      })),
      domains: domains.map((d) => ({
        id: d.id,
        name: d.name,
        type: 'domain',
        subtitle: null,
      })),
    });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

function getTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default router;

