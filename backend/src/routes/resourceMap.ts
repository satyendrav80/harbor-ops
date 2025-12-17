import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth';
import { prisma } from '../dataStore';
const router = Router();

router.use(requireAuth);

/**
 * GET /resource-map
 * Returns all resources (servers, services, credentials, domains) with their relationships
 * This is used for the resource map/graph visualization
 */
router.get('/', requirePermission('servers:view'), async (req, res) => {
  try {
    // Fetch all resources with their relationships in parallel
    const [servers, services, credentials, domains] = await Promise.all([
      // Servers with their credentials, domains, and tags
      prisma.server.findMany({
        where: { deleted: false },
        include: {
          credentials: {
            include: {
              credential: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          domains: {
            include: {
              domain: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  value: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      // Services with their servers, credentials, domains, dependencies, and tags
      prisma.service.findMany({
        where: { deleted: false },
        include: {
          servers: {
            include: {
              server: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          credentials: {
            include: {
              credential: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          domains: {
            include: {
              domain: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          dependencies: {
            include: {
              dependencyService: {
                select: {
                  id: true,
                  name: true,
                  port: true,
                },
              },
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  value: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      // Credentials with their servers and services
      prisma.credential.findMany({
        where: { deleted: false },
        include: {
          servers: {
            include: {
              server: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  port: true,
                },
              },
            },
          },
        },
      }),
      // Domains with their servers and services
      prisma.domain.findMany({
        where: { deleted: false },
        include: {
          servers: {
            include: {
              server: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  port: true,
                },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      servers,
      services,
      credentials,
      domains,
    });
  } catch (error: any) {
    console.error('Error fetching resource map:', error);
    res.status(500).json({ error: 'Failed to fetch resource map' });
  }
});

export default router;

