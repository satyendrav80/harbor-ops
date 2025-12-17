import { Router } from 'express';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { logAudit, getChanges, getRequestMetadata } from '../utils/audit';
import { AuditResourceType, AuditAction } from '@prisma/client';
import { emitEntityChanged } from '../socket/socket';
import { prisma } from '../dataStore';
const router = Router();

router.use(requireAuth);

// Broadcast group changes on successful mutations
router.use((req, res, next) => {
  res.on('finish', () => {
    if (req.method !== 'GET' && res.statusCode < 400) {
      try {
        emitEntityChanged('group');
      } catch (err) {
        // ignore socket emission failures
      }
    }
  });
  next();
});

// Get all groups with item counts
router.get('/', requirePermission('groups:view'), async (req, res) => {
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
    prisma.group.findMany({
      where: {
        ...searchConditions,
        deleted: false, // Exclude deleted records
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
        items: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.group.count({ where: { ...searchConditions, deleted: false } }),
  ]);

  res.json({
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Create a new group
router.post('/', requirePermission('groups:create'), async (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  try {
    const created = await prisma.group.create({ 
      data: { 
        name: name.trim(),
        createdBy: req.user?.id || null,
      } 
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.group,
      resourceId: created.id.toString(),
      action: AuditAction.create,
      userId: req.user?.id,
      changes: { created: created },
      ...requestMetadata,
    });
    
    res.status(201).json(created);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Group name already exists' });
    }
    return res.status(400).json({ error: 'Failed to create group' });
  }
});

// Get a single group with full item details
router.get('/:id', requirePermission('groups:view'), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }
  
  const group = await prisma.group.findUnique({
    where: { id, deleted: false },
    include: {
      items: true,
      createdByUser: { select: { id: true, name: true, email: true } },
      updatedByUser: { select: { id: true, name: true, email: true } },
    },
  });
  
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  // Fetch all items by type (itemId is now stored as string in DB, convert to number for numeric IDs)
  const serverIds = group.items.filter((item) => item.itemType === 'server').map((item) => Number(item.itemId));
  const serviceIds = group.items.filter((item) => item.itemType === 'service').map((item) => Number(item.itemId));
  const credentialIds = group.items.filter((item) => item.itemType === 'credential').map((item) => Number(item.itemId));
  const domainIds = group.items.filter((item) => item.itemType === 'domain').map((item) => Number(item.itemId));
  const userIds = group.items.filter((item) => item.itemType === 'user').map((item) => item.itemId);
  
  const [servers, services, credentials, domains, users] = await Promise.all([
    serverIds.length > 0 ? prisma.server.findMany({
      where: { id: { in: serverIds }, deleted: false },
      select: {
        id: true,
        name: true,
        publicIp: true,
        privateIp: true,
        sshPort: true,
      },
    }) : [],
    serviceIds.length > 0 ? prisma.service.findMany({
      where: { id: { in: serviceIds }, deleted: false },
      select: {
        id: true,
        name: true,
        port: true,
        servers: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }) : [],
    credentialIds.length > 0 ? prisma.credential.findMany({
      where: { id: { in: credentialIds }, deleted: false },
      select: {
        id: true,
        name: true,
        type: true,
      },
    }) : [],
    domainIds.length > 0 ? prisma.domain.findMany({
      where: { id: { in: domainIds }, deleted: false },
      select: {
        id: true,
        name: true,
      },
    }) : [],
    userIds.length > 0 ? prisma.user.findMany({
      where: { id: { in: userIds }, deleted: false },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }) : [],
  ]);
  
  // Create lookup maps (use string keys for itemId matching)
  const serverMap = new Map(servers.map((s) => [s.id.toString(), s]));
  const serviceMap = new Map(services.map((s) => [s.id.toString(), s]));
  const credentialMap = new Map(credentials.map((c) => [c.id.toString(), c]));
  const domainMap = new Map(domains.map((d) => [d.id.toString(), d]));
  const userMap = new Map(users.map((u) => [u.id, u]));
  
  // Transform items to include actual item data
  const transformedItems = group.items.map((item) => {
    if (item.itemType === 'server') {
      const server = serverMap.get(item.itemId);
      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        server: server || null,
      };
    } else if (item.itemType === 'service') {
      const service = serviceMap.get(item.itemId);
      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        service: service || null,
      };
    } else if (item.itemType === 'credential') {
      const credential = credentialMap.get(item.itemId);
      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        credential: credential || null,
      };
    } else if (item.itemType === 'domain') {
      const domain = domainMap.get(item.itemId);
      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        domain: domain || null,
      };
    } else if (item.itemType === 'user') {
      const user = userMap.get(item.itemId);
      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        user: user || null,
      };
    }
    return {
      id: item.id,
      itemType: item.itemType,
      itemId: item.itemId,
    };
  });

  res.json({
    ...group,
    items: transformedItems,
  });
});

// Get groups containing a specific server, service, credential, domain, or user
router.get('/by-item/:itemType/:itemId', requirePermission('groups:view'), async (req, res) => {
  const itemType = req.params.itemType;
  const itemId = req.params.itemId;
  
  const validItemTypes = ['server', 'service', 'credential', 'domain', 'user'];
  if (!validItemTypes.includes(itemType)) {
    return res.status(400).json({ error: 'Invalid item type. Must be one of: server, service, credential, domain, user' });
  }

  // For user, itemId is a string; for others, convert to string (database stores as TEXT)
  let parsedItemId: string;
  if (itemType === 'user') {
    parsedItemId = itemId; // User IDs are strings (CUIDs)
  } else {
    const numId = Number(itemId);
    if (isNaN(numId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    parsedItemId = numId.toString(); // Convert to string for database
  }

  const groups = await prisma.group.findMany({
    where: {
      deleted: false, // Exclude deleted groups
      items: {
        some: {
          itemType: itemType as 'server' | 'service' | 'credential' | 'domain' | 'user',
          itemId: parsedItemId,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  res.json(groups.map((g) => g.id));
});

// Update a group
router.put('/:id', requirePermission('groups:update'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }
  const group = await prisma.group.findUnique({ where: { id, deleted: false } });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  const oldGroup = { ...group };
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  try {
    const updated = await prisma.group.update({
      where: { id },
      data: { 
        name: name.trim(),
        updatedBy: req.user?.id || null,
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    const changes = getChanges(oldGroup, updated);
    if (changes) {
      await logAudit({
        resourceType: AuditResourceType.group,
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
      return res.status(409).json({ error: 'Group name already exists' });
    }
    return res.status(400).json({ error: 'Failed to update group' });
  }
});

// Delete a group
router.delete('/:id', requirePermission('groups:delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }

  const group = await prisma.group.findUnique({ where: { id, deleted: false } });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  try {
    // Soft delete
    await prisma.group.update({
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
      resourceType: AuditResourceType.group,
      resourceId: id.toString(),
      action: AuditAction.delete,
      userId: req.user?.id,
      changes: { deleted: group },
      ...requestMetadata,
    });
    
    res.status(204).end();
  } catch (error: any) {
    return res.status(400).json({ error: 'Failed to delete group' });
  }
});

// Add item to group (server, service, credential, domain, or user)
router.post('/:id/items', requirePermission('groups:update'), async (req, res) => {
  const groupId = Number(req.params.id);
  if (isNaN(groupId)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }
  const { itemType, itemId } = req.body;
  
  const validItemTypes = ['server', 'service', 'credential', 'domain', 'user'];
  if (!itemType || !validItemTypes.includes(itemType)) {
    return res.status(400).json({ error: 'Invalid item type. Must be one of: server, service, credential, domain, user' });
  }

  // For user, itemId is a string; for others, convert to string (database stores as TEXT)
  let parsedItemId: string;
  if (itemType === 'user') {
    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Valid user ID (string) is required' });
    }
    parsedItemId = itemId;
  } else {
    if (!itemId || (typeof itemId !== 'number' && typeof itemId !== 'string')) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }
    const numId = typeof itemId === 'number' ? itemId : Number(itemId);
    if (isNaN(numId)) {
      return res.status(400).json({ error: 'Valid item ID (number) is required' });
    }
    parsedItemId = numId.toString(); // Convert to string for database
  }

  // Check if group exists
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Check if item exists (convert string ID to number for numeric IDs)
  if (itemType === 'server') {
    const server = await prisma.server.findUnique({ where: { id: Number(parsedItemId) } });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
  } else if (itemType === 'service') {
    const service = await prisma.service.findUnique({ where: { id: Number(parsedItemId) } });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
  } else if (itemType === 'credential') {
    const credential = await prisma.credential.findUnique({ where: { id: Number(parsedItemId) } });
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }
  } else if (itemType === 'domain') {
    const domain = await prisma.domain.findUnique({ where: { id: Number(parsedItemId) } });
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
  } else if (itemType === 'user') {
    const user = await prisma.user.findUnique({ where: { id: parsedItemId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
  }

  // Check if item already in group
  const existing = await prisma.groupItem.findFirst({
    where: {
      groupId,
      itemType: itemType as 'server' | 'service' | 'credential' | 'domain' | 'user',
      itemId: parsedItemId,
    },
  });
  if (existing) {
    return res.status(409).json({ error: 'Item already exists in this group' });
  }

  try {
    const item = await prisma.groupItem.create({
      data: {
        groupId,
        itemType: itemType as 'server' | 'service' | 'credential' | 'domain' | 'user',
        itemId: parsedItemId,
      },
    });

    // Fetch the actual server or service data
    let response: any = {
      id: item.id,
      itemType: item.itemType,
      itemId: item.itemId,
    };

    if (itemType === 'server') {
      const server = await prisma.server.findUnique({
        where: { id: Number(parsedItemId) },
        select: {
          id: true,
          name: true,
          publicIp: true,
          privateIp: true,
          sshPort: true,
        },
      });
      if (server) {
        response.server = server;
      }
    } else if (itemType === 'service') {
      const service = await prisma.service.findUnique({
        where: { id: Number(parsedItemId) },
        select: {
          id: true,
          name: true,
          port: true,
          servers: {
            include: {
              server: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      if (service) {
        response.service = service;
      }
    } else if (itemType === 'credential') {
      const credential = await prisma.credential.findUnique({
        where: { id: Number(parsedItemId) },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });
      if (credential) {
        response.credential = credential;
      }
    } else if (itemType === 'domain') {
      const domain = await prisma.domain.findUnique({
        where: { id: Number(parsedItemId) },
        select: {
          id: true,
          name: true,
        },
      });
      if (domain) {
        response.domain = domain;
      }
    } else if (itemType === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: parsedItemId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
      if (user) {
        response.user = user;
      }
    }

    res.status(201).json(response);
  } catch (error: any) {
    return res.status(400).json({ error: 'Failed to add item to group' });
  }
});

// Remove item from group
router.delete('/:id/items/:itemId', requirePermission('groups:update'), async (req, res) => {
  const groupId = Number(req.params.id);
  const itemId = req.params.itemId; // itemId is now a string (stored as TEXT in DB)
  
  if (isNaN(groupId)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }

  try {
    await prisma.groupItem.deleteMany({
      where: {
        groupId,
        itemId,
      },
    });
    res.status(204).end();
  } catch (error: any) {
    return res.status(400).json({ error: 'Failed to remove item from group' });
  }
});

export default router;
