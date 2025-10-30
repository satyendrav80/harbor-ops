import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

function mask(cred: any) {
  return { ...cred, data: 'hidden' };
}

router.get('/', async (req: any, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.credential.findMany({
      where: searchConditions,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.credential.count({ where: searchConditions }),
  ]);

  const hasPerm = await requireHasPermission(req.user?.id, 'view_cred');
  res.json({
    data: hasPerm ? items : items.map(mask),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/', requirePermission('edit_server'), async (req, res) => {
  const { name, type, data } = req.body;
  const created = await prisma.credential.create({ data: { name, type, data } });
  res.status(201).json(created);
});

router.get('/:id', async (req: any, res) => {
  const id = Number(req.params.id);
  const item = await prisma.credential.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  const hasPerm = (await requireHasPermission(req.user?.id, 'view_cred'));
  res.json(hasPerm ? item : mask(item));
});

router.put('/:id', requirePermission('edit_server'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, type, data } = req.body;
  const updated = await prisma.credential.update({ where: { id }, data: { name, type, data } });
  res.json(updated);
});

router.delete('/:id', requirePermission('edit_server'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.credential.delete({ where: { id } });
  res.status(204).end();
});

async function requireHasPermission(userId: string | undefined, perm: string) {
  if (!userId) return false;
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  return roles.some((ur) => ur.role.permissions.some((rp) => rp.permission.name === perm));
}

export default router;
