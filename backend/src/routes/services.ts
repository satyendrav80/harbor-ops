import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('services:view'), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const include = (req.query.include as string | undefined) ?? '';
  const offset = (page - 1) * limit;
  const includeRelations = include.split(',').includes('relations');

  // Build search conditions
  const searchConditions: any = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          ...(isNaN(Number(search)) ? [] : [{ port: { equals: Number(search) } }]),
          {
            server: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { publicIp: { contains: search, mode: 'insensitive' } },
                { privateIp: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }
    : {};

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where: searchConditions,
      include: includeRelations
        ? {
            server: true,
            credentials: { include: { credential: true } },
            domains: { include: { domain: true } },
            tags: { include: { tag: true } },
            releaseNotes: true,
          }
        : undefined,
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

router.post('/', requirePermission('services:create'), async (req, res) => {
  const { name, port, serverId, credentialIds, domainIds, sourceRepo, appId, functionName, deploymentUrl, metadata } = req.body;
  
  // Create service with credentials and domains in a transaction
  const created = await prisma.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        name,
        port: Number(port),
        serverId: Number(serverId),
        sourceRepo: sourceRepo || null,
        appId: appId || null,
        functionName: functionName || null,
        deploymentUrl: deploymentUrl || null,
        metadata: metadata || null,
      },
    });
    
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
    
    // Return service with relations
    return await tx.service.findUnique({
      where: { id: service.id },
      include: {
        server: true,
        credentials: { include: { credential: true } },
        domains: { include: { domain: true } },
      },
    });
  });
  
  res.status(201).json(created);
});

router.get('/:id', requirePermission('services:view'), async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.service.findUnique({
    where: { id },
    include: {
      server: true,
      credentials: { include: { credential: true } },
      domains: { include: { domain: true } },
      tags: { include: { tag: true } },
      releaseNotes: true,
    },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', requirePermission('services:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, port, serverId, credentialIds, domainIds, sourceRepo, appId, functionName, deploymentUrl, metadata } = req.body;
  
  // Update service with credentials and domains in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Update service
    await tx.service.update({
      where: { id },
      data: {
        name,
        port: Number(port),
        serverId: Number(serverId),
        sourceRepo: sourceRepo !== undefined ? (sourceRepo || null) : undefined,
        appId: appId !== undefined ? (appId || null) : undefined,
        functionName: functionName !== undefined ? (functionName || null) : undefined,
        deploymentUrl: deploymentUrl !== undefined ? (deploymentUrl || null) : undefined,
        metadata: metadata !== undefined ? (metadata || null) : undefined,
      },
    });
    
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
    
    // Return service with relations
    return await tx.service.findUnique({
      where: { id },
      include: {
        server: true,
        credentials: { include: { credential: true } },
        domains: { include: { domain: true } },
      },
    });
  });
  
  res.json(updated);
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
