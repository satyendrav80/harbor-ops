import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

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
      where: searchConditions,
      select: {
        id: true,
        name: true,
        createdAt: true,
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
    prisma.group.count({ where: searchConditions }),
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
router.post('/', requirePermission('groups:create'), async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  try {
    const created = await prisma.group.create({ data: { name: name.trim() } });
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
    where: { id },
    include: {
      items: true,
    },
  });
  
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  // Fetch all servers and services for the items
  const serverIds = group.items.filter((item) => item.itemType === 'server').map((item) => item.itemId);
  const serviceIds = group.items.filter((item) => item.itemType === 'service').map((item) => item.itemId);
  
  const [servers, services] = await Promise.all([
    serverIds.length > 0 ? prisma.server.findMany({
      where: { id: { in: serverIds } },
      select: {
        id: true,
        name: true,
        publicIp: true,
        privateIp: true,
        sshPort: true,
      },
    }) : [],
    serviceIds.length > 0 ? prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: {
        id: true,
        name: true,
        port: true,
        serverId: true,
        server: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }) : [],
  ]);
  
  // Create lookup maps
  const serverMap = new Map(servers.map((s) => [s.id, s]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  
  // Transform items to include actual server/service data
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

// Update a group
router.put('/:id', requirePermission('groups:update'), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  try {
    const updated = await prisma.group.update({ where: { id }, data: { name: name.trim() } });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Group name already exists' });
    }
    return res.status(400).json({ error: 'Failed to update group' });
  }
});

// Delete a group
router.delete('/:id', requirePermission('groups:delete'), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }
  try {
    await prisma.group.delete({ where: { id } });
    res.status(204).end();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Group not found' });
    }
    return res.status(400).json({ error: 'Failed to delete group' });
  }
});

// Add item to group (server or service)
router.post('/:id/items', requirePermission('groups:update'), async (req, res) => {
  const groupId = Number(req.params.id);
  if (isNaN(groupId)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }
  const { itemType, itemId } = req.body;
  
  if (!itemType || !['server', 'service'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid item type. Must be "server" or "service"' });
  }
  if (!itemId || typeof itemId !== 'number' || isNaN(itemId)) {
    return res.status(400).json({ error: 'Valid item ID is required' });
  }

  // Check if group exists
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Check if item exists
  if (itemType === 'server') {
    const server = await prisma.server.findUnique({ where: { id: itemId } });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
  } else {
    const service = await prisma.service.findUnique({ where: { id: itemId } });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
  }

  // Check if item already in group
  const existing = await prisma.groupItem.findFirst({
    where: {
      groupId,
      itemType,
      itemId,
    },
  });
  if (existing) {
    return res.status(409).json({ error: 'Item already exists in this group' });
  }

  try {
    const item = await prisma.groupItem.create({
      data: {
        groupId,
        itemType,
        itemId,
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
        where: { id: itemId },
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
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          port: true,
          serverId: true,
          server: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      if (service) {
        response.service = service;
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
  const itemId = Number(req.params.itemId);
  
  if (isNaN(groupId) || isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid group ID or item ID' });
  }

  try {
    await prisma.groupItem.delete({
      where: { id: itemId },
    });
    res.status(204).end();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found in group' });
    }
    return res.status(400).json({ error: 'Failed to remove item from group' });
  }
});

export default router;
