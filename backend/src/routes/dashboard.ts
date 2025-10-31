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
    const [totalServers, totalServices, totalCredentials, totalTags] = await Promise.all([
      prisma.server.count(),
      prisma.service.count(),
      prisma.credential.count(),
      prisma.tag.count(),
    ]);

    res.json({
      totalServers,
      activeServices: totalServices,
      totalCredentials,
      totalTags,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * GET /dashboard/server-status
 * Get server status counts (online, warning, offline)
 * For now, we'll use a simple heuristic based on server metadata
 * In production, this would come from actual health checks
 */
router.get('/server-status', requirePermission('dashboard:view'), async (_req, res) => {
  try {
    const total = await prisma.server.count();
    
    // For now, simulate status distribution
    // In production, this would be based on actual health checks stored in the database
    // We can enhance this later with actual health monitoring
    const online = Math.floor(total * 0.8);
    const warning = Math.floor(total * 0.15);
    const offline = total - online - warning;

    res.json({
      total,
      online,
      warning,
      offline,
    });
  } catch (error) {
    console.error('Error fetching server status:', error);
    res.status(500).json({ error: 'Failed to fetch server status' });
  }
});

/**
 * GET /dashboard/service-health
 * Get service health status
 * For now, we'll use a simple heuristic
 * In production, this would come from actual service monitoring
 */
router.get('/service-health', requirePermission('dashboard:view'), async (_req, res) => {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Limit to top 10 services for dashboard
    });

    // For now, simulate health percentages based on index
    // In production, this would be based on actual health metrics
    const serviceHealth = services.map((service, index) => ({
      id: service.id,
      name: service.name,
      health: index % 4 === 0 ? 100 : index % 4 === 1 ? 100 : index % 4 === 2 ? 85 : 0,
    }));

    res.json(serviceHealth);
  } catch (error) {
    console.error('Error fetching service health:', error);
    res.status(500).json({ error: 'Failed to fetch service health' });
  }
});

/**
 * GET /dashboard/recent-alerts
 * Get recent alerts/activity
 * Currently based on pending release notes and can be extended
 */
router.get('/recent-alerts', requirePermission('dashboard:view'), async (_req, res) => {
  try {
    const releaseNotes = await prisma.releaseNote.findMany({
      where: {
        status: ReleaseStatus.pending,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    
    const serviceMap = new Map(services.map((s) => [s.id, s.name]));

    // Create alerts from pending release notes
    const alerts = releaseNotes.slice(0, 10).map((rn, index) => {
      const createdAt = new Date(rn.createdAt);
      const timeAgo = getTimeAgo(createdAt);
      
      // Determine status based on index for variety
      let status: 'high' | 'degraded' | 'expiring' | 'recovered';
      if (index === 0) status = 'high';
      else if (index === 1) status = 'degraded';
      else if (index === 2) status = 'expiring';
      else status = 'recovered';

      return {
        id: rn.id,
        timestamp: timeAgo,
        item: serviceMap.get(rn.serviceId) || `service-${rn.serviceId}`,
        status,
        action: index === 2 ? 'Renew' : 'Details',
      };
    });

    res.json(alerts);
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
          OR: [
            { name: searchPattern },
            { username: searchPattern },
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
        },
        take: limit,
      }),
      prisma.domain.findMany({
        where: {
          domain: searchPattern,
        },
        select: {
          id: true,
          domain: true,
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
        subtitle: c.username,
      })),
      domains: domains.map((d) => ({
        id: d.id,
        name: d.domain,
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

