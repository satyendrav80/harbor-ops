import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

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

  res.json({
    data: servers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/', requirePermission('servers:create'), async (req, res) => {
  const { name, publicIp, privateIp, sshPort, username, password } = req.body;
  const created = await prisma.server.create({ data: { name, publicIp, privateIp, sshPort: Number(sshPort), username, password } });
  res.status(201).json(created);
});

router.get('/:id', requirePermission('servers:view'), async (req, res) => {
  const id = Number(req.params.id);
  const server = await prisma.server.findUnique({ where: { id } });
  if (!server) return res.status(404).json({ error: 'Not found' });
  res.json(server);
});

router.put('/:id', requirePermission('servers:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, publicIp, privateIp, sshPort, username, password } = req.body;
  const updated = await prisma.server.update({ where: { id }, data: { name, publicIp, privateIp, sshPort: Number(sshPort), username, password } });
  res.json(updated);
});

router.delete('/:id', requirePermission('servers:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.server.delete({ where: { id } });
  res.status(204).end();
});

export default router;
