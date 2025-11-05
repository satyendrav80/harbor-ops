import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { logAudit, getChanges, getRequestMetadata } from '../utils/audit';
import { AuditResourceType, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

// Get all domains
router.get('/', requirePermission('domains:view'), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = search
    ? {
        name: { contains: search, mode: 'insensitive' },
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.domain.findMany({
      where: {
        ...searchConditions,
        deleted: false, // Exclude deleted records
      },
      include: {
        tags: { include: { tag: { select: { id: true, name: true, value: true, color: true } } } },
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.domain.count({ where: { ...searchConditions, deleted: false } }),
  ]);

  // Transform items to include tags as array
  const processedItems = items.map((item) => ({
    ...item,
    tags: item.tags.map((dt: any) => dt.tag),
  }));

  res.json({
    data: processedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Create a new domain
router.post('/', requirePermission('domains:create'), async (req: AuthRequest, res) => {
  const { name, tagIds } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Domain name is required' });
  }
  
  try {
    const created = await prisma.$transaction(async (tx) => {
      const domain = await tx.domain.create({ 
        data: { 
          name: name.trim(),
          createdBy: req.user?.id || null,
        } 
      });

      // Attach tags if provided
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        const tagData = tagIds.map((tagId: number) => ({
          domainId: domain.id,
          tagId: Number(tagId),
        }));
        await tx.domainTag.createMany({ data: tagData, skipDuplicates: true });
      }

      // Return domain with tags
      const tags = await tx.domainTag.findMany({
        where: { domainId: domain.id },
        include: { tag: true },
      });

      return {
        ...domain,
        tags: tags.map((dt) => dt.tag),
      };
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.domain,
      resourceId: created.id.toString(),
      action: AuditAction.create,
      userId: req.user?.id,
      changes: { created: created },
      ...requestMetadata,
    });
    
    res.status(201).json(created);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Domain already exists' });
    }
    return res.status(400).json({ error: 'Failed to create domain' });
  }
});

// Get a single domain
router.get('/:id', requirePermission('domains:view'), async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.domain.findUnique({ 
    where: { id, deleted: false },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      updatedByUser: { select: { id: true, name: true, email: true } },
    },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Update a domain
router.put('/:id', requirePermission('domains:update'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const domain = await prisma.domain.findUnique({ where: { id, deleted: false } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });
  
  const oldDomain = { ...domain };
  const { name, tagIds } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Domain name is required' });
  }
  
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const domain = await tx.domain.update({ 
        where: { id }, 
        data: { 
          name: name.trim(),
          updatedBy: req.user?.id || null,
        } 
      });

      // Update tags if provided
      if (tagIds !== undefined) {
        // Remove all existing tags
        await tx.domainTag.deleteMany({ where: { domainId: id } });
        
        // Add new tags if provided
        if (Array.isArray(tagIds) && tagIds.length > 0) {
          const tagData = tagIds.map((tagId: number) => ({
            domainId: id,
            tagId: Number(tagId),
          }));
          await tx.domainTag.createMany({ data: tagData, skipDuplicates: true });
        }
      }

      // Return domain with tags
      const tags = await tx.domainTag.findMany({
        where: { domainId: id },
        include: { tag: true },
      });

      return {
        ...domain,
        tags: tags.map((dt) => dt.tag),
      };
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    const changes = getChanges(oldDomain, updated);
    if (changes) {
      await logAudit({
        resourceType: AuditResourceType.domain,
        resourceId: id.toString(),
        action: AuditAction.update,
        userId: req.user?.id,
        changes,
        ...requestMetadata,
      });
    }
    
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Domain already exists' });
    }
    return res.status(400).json({ error: 'Failed to update domain' });
  }
});

// Delete a domain
router.delete('/:id', requirePermission('domains:delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const domain = await prisma.domain.findUnique({ where: { id, deleted: false } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });
  
  // Soft delete
  await prisma.domain.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: req.user?.id || null,
    },
  });
  
  // Log audit
  const requestMetadata = getRequestMetadata(req);
  await logAudit({
    resourceType: AuditResourceType.domain,
    resourceId: id.toString(),
    action: AuditAction.delete,
    userId: req.user?.id,
    changes: { deleted: domain },
    ...requestMetadata,
  });
  
  res.status(204).end();
});

// Get domains for a specific server or service
router.get('/by-item/:itemType/:itemId', requirePermission('domains:view'), async (req, res) => {
  const itemType = req.params.itemType;
  const itemId = Number(req.params.itemId);

  if (!['server', 'service'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid item type. Must be "server" or "service"' });
  }
  if (isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  try {
    if (itemType === 'server') {
      const serverDomains = await prisma.serverDomain.findMany({
        where: {
          serverId: itemId,
        },
        select: {
          domainId: true,
        },
      });
      const domainIds = serverDomains.map((sd) => sd.domainId);
      res.json(domainIds);
    } else {
      const serviceDomains = await prisma.serviceDomain.findMany({
        where: {
          serviceId: itemId,
        },
        select: {
          domainId: true,
        },
      });
      const domainIds = serviceDomains.map((sd) => sd.domainId);
      res.json(domainIds);
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch domains by item' });
  }
});

export default router;

