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
  const { name, type, publicIp, privateIp, sshPort, username, password } = req.body;
  const encryptedPassword = password ? encrypt(password) : null;
  const created = await prisma.server.create({ 
    data: { 
      name,
      type: type || 'os',
      publicIp, 
      privateIp, 
      sshPort: Number(sshPort), 
      username, 
      password: encryptedPassword 
    } 
  });
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
  const { name, type, publicIp, privateIp, sshPort, username, password } = req.body;
  
  const updateData: any = {
    name,
    publicIp,
    privateIp,
    sshPort: Number(sshPort),
    username,
  };

  // Update type if provided
  if (type !== undefined) {
    updateData.type = type;
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

export default router;
