import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('services:view'), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const include = (req.query.include as string | undefined) ?? '';
  const serviceId = req.query.serviceId ? Number(req.query.serviceId) : undefined;
  const serverId = req.query.serverId ? Number(req.query.serverId) : undefined;
  const offset = (page - 1) * limit;
  const includeRelations = include.split(',').includes('relations');

  // Build search conditions
  const searchConditions: any = {};
  
  // Filter by serviceId if provided (exact match)
  if (serviceId) {
    searchConditions.id = serviceId;
  }
  
  // Filter by serverId if provided
  if (serverId) {
    searchConditions.servers = {
      some: {
        serverId: serverId,
      },
    };
  }
  
  // Add search conditions if not filtering by exact serviceId
  if (search && !serviceId) {
    searchConditions.OR = [
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
    ];
  }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where: searchConditions,
      include: {
        ...(includeRelations ? {
            servers: { include: { server: true } },
            credentials: { include: { credential: true } },
            domains: { include: { domain: true } },
            tags: { include: { tag: true } },
            releaseNotes: true,
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
          } : {}),
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.service.count({ where: searchConditions }),
  ]);

  res.json({
    data: services,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/', requirePermission('services:create'), async (req: AuthRequest, res) => {
  const { name, port, external, serverIds, credentialIds, domainIds, tagIds, sourceRepo, appId, functionName, deploymentUrl, documentationUrl, documentation, metadata } = req.body;
  
  // Validate serverIds
  if (!serverIds || !Array.isArray(serverIds) || serverIds.length === 0) {
    return res.status(400).json({ error: 'At least one server is required' });
  }
  
  // Create service with credentials and domains in a transaction
  const created = await prisma.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        name,
        port: Number(port),
        external: external === true || external === 'true',
        sourceRepo: sourceRepo || null,
        appId: appId || null,
        functionName: functionName || null,
        deploymentUrl: deploymentUrl || null,
        documentationUrl: documentationUrl || null,
        documentation: documentation || null,
        metadata: metadata || null,
        createdBy: req.user?.id || null,
      },
    });
    
    // Attach servers
    if (serverIds && Array.isArray(serverIds) && serverIds.length > 0) {
      const serverData = serverIds.map((servId: number) => ({
        serviceId: service.id,
        serverId: Number(servId),
      }));
      await tx.serviceServer.createMany({ data: serverData, skipDuplicates: true });
    }
    
    // Attach credentials if provided
    if (credentialIds && Array.isArray(credentialIds) && credentialIds.length > 0) {
      const credentialData = credentialIds.map((credId: number) => ({
        serviceId: service.id,
        credentialId: Number(credId),
      }));
      await tx.serviceCredential.createMany({ data: credentialData, skipDuplicates: true });
    }
    
    // Attach domains if provided
    if (domainIds && Array.isArray(domainIds) && domainIds.length > 0) {
      const domainData = domainIds.map((domainId: number) => ({
        serviceId: service.id,
        domainId: Number(domainId),
      }));
      await tx.serviceDomain.createMany({ data: domainData, skipDuplicates: true });
    }
    
    // Attach tags if provided
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      const tagData = tagIds.map((tagId: number) => ({
        serviceId: service.id,
        tagId: Number(tagId),
      }));
      await tx.serviceTag.createMany({ data: tagData, skipDuplicates: true });
    }
    
    // Return service with relations
    return await tx.service.findUnique({
      where: { id: service.id },
      include: {
        servers: { include: { server: true } },
        credentials: { include: { credential: true } },
        domains: { include: { domain: true } },
        tags: { include: { tag: true } },
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
      },
    });
  });
  
  res.status(201).json(created);
});

router.get('/:id', requirePermission('services:view'), async (req, res) => {
  const id = Number(req.params.id);
  
  // Validate that id is a valid number
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid service ID' });
  }
  
  const item = await prisma.service.findUnique({
    where: { id },
    include: {
      servers: { include: { server: true } },
      credentials: { include: { credential: true } },
      domains: { include: { domain: true } },
      tags: { include: { tag: true } },
      releaseNotes: true,
      dependencies: {
        include: {
          dependencyService: {
            select: {
              id: true,
              name: true,
              port: true,
              external: true,
            },
          },
        },
      },
      createdByUser: { select: { id: true, name: true, email: true } },
      updatedByUser: { select: { id: true, name: true, email: true } },
    },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', requirePermission('services:update'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { name, port, external, serverIds, credentialIds, domainIds, tagIds, sourceRepo, appId, functionName, deploymentUrl, documentationUrl, documentation, metadata } = req.body;
  
  // Validate serverIds if provided
  if (serverIds !== undefined && (!Array.isArray(serverIds) || serverIds.length === 0)) {
    return res.status(400).json({ error: 'At least one server is required' });
  }
  
  // Update service with credentials and domains in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Update service
    await tx.service.update({
      where: { id },
      data: {
        name,
        port: Number(port),
        external: external !== undefined ? (external === true || external === 'true') : undefined,
        sourceRepo: sourceRepo !== undefined ? (sourceRepo || null) : undefined,
        appId: appId !== undefined ? (appId || null) : undefined,
        functionName: functionName !== undefined ? (functionName || null) : undefined,
        deploymentUrl: deploymentUrl !== undefined ? (deploymentUrl || null) : undefined,
        documentationUrl: documentationUrl !== undefined ? (documentationUrl || null) : undefined,
        documentation: documentation !== undefined ? (documentation || null) : undefined,
        metadata: metadata !== undefined ? (metadata || null) : undefined,
        updatedBy: req.user?.id || null,
      },
    });
    
    // Update servers if provided
    if (serverIds !== undefined) {
      // Remove all existing servers
      await tx.serviceServer.deleteMany({ where: { serviceId: id } });
      
      // Add new servers if provided
      if (Array.isArray(serverIds) && serverIds.length > 0) {
        const serverData = serverIds.map((servId: number) => ({
          serviceId: id,
          serverId: Number(servId),
        }));
        await tx.serviceServer.createMany({ data: serverData, skipDuplicates: true });
      }
    }
    
    // Update credentials if provided
    if (credentialIds !== undefined) {
      // Remove all existing credentials
      await tx.serviceCredential.deleteMany({ where: { serviceId: id } });
      
      // Add new credentials if provided
      if (Array.isArray(credentialIds) && credentialIds.length > 0) {
        const credentialData = credentialIds.map((credId: number) => ({
          serviceId: id,
          credentialId: Number(credId),
        }));
        await tx.serviceCredential.createMany({ data: credentialData, skipDuplicates: true });
      }
    }
    
    // Update domains if provided
    if (domainIds !== undefined) {
      // Remove all existing domains
      await tx.serviceDomain.deleteMany({ where: { serviceId: id } });
      
      // Add new domains if provided
      if (Array.isArray(domainIds) && domainIds.length > 0) {
        const domainData = domainIds.map((domainId: number) => ({
          serviceId: id,
          domainId: Number(domainId),
        }));
        await tx.serviceDomain.createMany({ data: domainData, skipDuplicates: true });
      }
    }
    
    // Update tags if provided
    if (tagIds !== undefined) {
      // Remove all existing tags
      await tx.serviceTag.deleteMany({ where: { serviceId: id } });
      
      // Add new tags if provided
      if (Array.isArray(tagIds) && tagIds.length > 0) {
        const tagData = tagIds.map((tagId: number) => ({
          serviceId: id,
          tagId: Number(tagId),
        }));
        await tx.serviceTag.createMany({ data: tagData, skipDuplicates: true });
      }
    }
    
    // Return service with relations
    return await tx.service.findUnique({
      where: { id },
      include: {
        servers: { include: { server: true } },
        credentials: { include: { credential: true } },
        domains: { include: { domain: true } },
        tags: { include: { tag: true } },
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
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
      },
    });
  });
  
  res.json(updated);
});

// POST /services/:id/dependencies - Add a dependency
router.post('/:id/dependencies', requirePermission('services:update'), async (req: AuthRequest, res) => {
  const serviceId = Number(req.params.id);
  const { dependencyServiceId, description } = req.body;
  
  // Validate: dependencyServiceId must be provided
  if (!dependencyServiceId) {
    return res.status(400).json({ error: 'dependencyServiceId is required' });
  }
  
  // Prevent self-dependency
  if (Number(dependencyServiceId) === serviceId) {
    return res.status(400).json({ error: 'Service cannot depend on itself' });
  }
  
  try {
    const dependency = await prisma.serviceDependency.create({
      data: {
        serviceId,
        dependencyServiceId: Number(dependencyServiceId),
        description: description || null,
        createdBy: req.user?.id || null,
      },
      include: {
        dependencyService: {
          select: {
            id: true,
            name: true,
            port: true,
            external: true,
          },
        },
      },
    });
    
    res.status(201).json(dependency);
  } catch (error) {
    console.error('Error creating service dependency:', error);
    res.status(500).json({ error: 'Failed to create service dependency' });
  }
});

// DELETE /services/:id/dependencies/:dependencyId - Remove a dependency
router.delete('/:id/dependencies/:dependencyId', requirePermission('services:update'), async (req, res) => {
  const serviceId = Number(req.params.id);
  const dependencyId = Number(req.params.dependencyId);
  
  try {
    // Verify the dependency belongs to this service
    const dependency = await prisma.serviceDependency.findUnique({
      where: { id: dependencyId },
    });
    
    if (!dependency || dependency.serviceId !== serviceId) {
      return res.status(404).json({ error: 'Dependency not found' });
    }
    
    await prisma.serviceDependency.delete({
      where: { id: dependencyId },
    });
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting service dependency:', error);
    res.status(500).json({ error: 'Failed to delete service dependency' });
  }
});

router.delete('/:id', requirePermission('services:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.service.delete({ where: { id } });
  res.status(204).end();
});

// Attach tags: POST /services/:id/tags { tagIds: number[] }
router.post('/:id/tags', requirePermission('services:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { tagIds } = req.body as { tagIds: number[] };
  const data = (tagIds || []).map((tagId) => ({ serviceId: id, tagId: Number(tagId) }));
  await prisma.serviceTag.createMany({ data, skipDuplicates: true });
  const updated = await prisma.service.findUnique({ where: { id }, include: { tags: true } });
  res.json(updated);
});

// Detach tag: DELETE /services/:id/tags/:tagId
router.delete('/:id/tags/:tagId', requirePermission('services:update'), async (req, res) => {
  const id = Number(req.params.id);
  const tagId = Number(req.params.tagId);
  await prisma.serviceTag.delete({ where: { serviceId_tagId: { serviceId: id, tagId } } });
  res.status(204).end();
});

export default router;
