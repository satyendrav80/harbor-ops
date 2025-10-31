import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();
const router = Router();

// Helper to remove password from response (don't send it)
function removePassword(server: any) {
  if (!server) return server;
  const { password, ...rest } = server;
  return rest;
}

router.use(requireAuth);

router.get('/', requirePermission('servers:view'), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { publicIp: { contains: search, mode: 'insensitive' } },
          { privateIp: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [servers, total] = await Promise.all([
    prisma.server.findMany({
      where: searchConditions,
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.server.count({ where: searchConditions }),
  ]);

  // Remove passwords from response
  const serversWithoutPassword = servers.map(removePassword);

  res.json({
    data: serversWithoutPassword,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/', requirePermission('servers:create'), async (req, res) => {
  const { name, type, publicIp, privateIp, endpoint, sshPort, username, password } = req.body;
  const encryptedPassword = password ? encrypt(password) : null;
  
  const data: any = {
    name,
    type: type || 'os', // Default to 'os' if not provided
  };
  
  // Only include fields that are relevant for the server type
  if (type === 'os' || !type) {
    data.publicIp = publicIp || null;
    data.privateIp = privateIp || null;
    data.sshPort = sshPort ? Number(sshPort) : null;
    data.username = username || null;
  } else if (type === 'rds') {
    data.endpoint = endpoint || null;
    data.sshPort = sshPort ? Number(sshPort) : null;
    data.username = username || null;
  } else {
    // For other types (amplify, lambda, etc.), only optional fields
    data.publicIp = publicIp || null;
    data.privateIp = privateIp || null;
    data.endpoint = endpoint || null;
    data.sshPort = sshPort ? Number(sshPort) : null;
    data.username = username || null;
  }
  
  if (encryptedPassword) {
    data.password = encryptedPassword;
  }
  
  const created = await prisma.server.create({ data });
  res.status(201).json(removePassword(created));
});

router.get('/:id', requirePermission('servers:view'), async (req, res) => {
  const id = Number(req.params.id);
  const server = await prisma.server.findUnique({ where: { id } });
  if (!server) return res.status(404).json({ error: 'Not found' });
  res.json(removePassword(server));
});

// Reveal password endpoint - requires credentials:reveal permission
router.get('/:id/reveal-password', requirePermission('credentials:reveal'), async (req, res) => {
  const id = Number(req.params.id);
  const server = await prisma.server.findUnique({ where: { id } });
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  if (!server.password) {
    return res.json({ password: null });
  }

  try {
    const decryptedPassword = decrypt(server.password);
    res.json({ password: decryptedPassword });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to decrypt password' });
  }
});

router.put('/:id', requirePermission('servers:update'), async (req, res) => {
  const id = Number(req.params.id);
  const server = await prisma.server.findUnique({ where: { id } });
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  const { name, type, publicIp, privateIp, endpoint, sshPort, username, password } = req.body;
  
  const updateData: any = {
    name,
  };

  // Update type if provided
  if (type !== undefined) {
    updateData.type = type;
  }
  
  const serverType = type || server.type;

  // Only include fields that are relevant for the server type
  if (serverType === 'os') {
    updateData.publicIp = publicIp !== undefined ? (publicIp || null) : undefined;
    updateData.privateIp = privateIp !== undefined ? (privateIp || null) : undefined;
    updateData.endpoint = null; // Clear endpoint for OS servers
    updateData.sshPort = sshPort !== undefined ? (sshPort ? Number(sshPort) : null) : undefined;
    updateData.username = username !== undefined ? (username || null) : undefined;
  } else if (serverType === 'rds') {
    updateData.endpoint = endpoint !== undefined ? (endpoint || null) : undefined;
    updateData.publicIp = null; // Clear IPs for RDS
    updateData.privateIp = null;
    updateData.sshPort = sshPort !== undefined ? (sshPort ? Number(sshPort) : null) : undefined;
    updateData.username = username !== undefined ? (username || null) : undefined;
  } else {
    // For other types (amplify, lambda, etc.), all fields optional
    if (publicIp !== undefined) updateData.publicIp = publicIp || null;
    if (privateIp !== undefined) updateData.privateIp = privateIp || null;
    if (endpoint !== undefined) updateData.endpoint = endpoint || null;
    if (sshPort !== undefined) updateData.sshPort = sshPort ? Number(sshPort) : null;
    if (username !== undefined) updateData.username = username || null;
  }

  // Only update password if provided
  if (password !== undefined && password !== null && password !== '') {
    updateData.password = encrypt(password);
  }

  const updated = await prisma.server.update({ where: { id }, data: updateData });
  res.json(removePassword(updated));
});

router.delete('/:id', requirePermission('servers:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.server.delete({ where: { id } });
  res.status(204).end();
});

// Attach tags: POST /servers/:id/tags { tagIds: number[] }
router.post('/:id/tags', requirePermission('servers:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { tagIds } = req.body as { tagIds: number[] };
  const data = (tagIds || []).map((tagId) => ({ serverId: id, tagId: Number(tagId) }));
  await prisma.serverTag.createMany({ data, skipDuplicates: true });
  const updated = await prisma.server.findUnique({ 
    where: { id }, 
    include: { tags: { include: { tag: true } } } 
  });
  res.json(updated ? removePassword(updated) : null);
});

// Detach tag: DELETE /servers/:id/tags/:tagId
router.delete('/:id/tags/:tagId', requirePermission('servers:update'), async (req, res) => {
  const id = Number(req.params.id);
  const tagId = Number(req.params.tagId);
  await prisma.serverTag.delete({ where: { serverId_tagId: { serverId: id, tagId } } });
  res.status(204).end();
});

export default router;
