import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

function mask(cred: any) {
  return { ...cred, data: 'hidden' };
}

async function hasCredentialsViewPermission(req: AuthRequest): Promise<boolean> {
  if (!req.user) return false;
  const userRoles = await prisma.userRole.findMany({
    where: { userId: req.user.id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  // Admin role bypasses permission checks
  if (userRoles.some((ur) => ur.role.name === 'admin')) {
    return true;
  }
  // Check for credentials:view or credentials:manage
  const hasView = userRoles.some((ur) => ur.role.permissions.some((rp) => rp.permission.name === 'credentials:view'));
  const hasManage = userRoles.some((ur) => ur.role.permissions.some((rp) => rp.permission.name === 'credentials:manage'));
  return hasView || hasManage;
}

router.get('/', requirePermission('credentials:view'), async (req: AuthRequest, res: Response) => {
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

  // Check if user can view full credential data (has view permission)
  const hasFullView = await hasCredentialsViewPermission(req);
  res.json({
    data: hasFullView ? items : items.map(mask),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/', requirePermission('credentials:create'), async (req, res) => {
  const { name, type, data } = req.body;
  const created = await prisma.credential.create({ data: { name, type, data } });
  res.status(201).json(created);
});

router.get('/:id', requirePermission('credentials:view'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const item = await prisma.credential.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  const hasFullView = await hasCredentialsViewPermission(req);
  res.json(hasFullView ? item : mask(item));
});

router.put('/:id', requirePermission('credentials:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, type, data } = req.body;
  const updated = await prisma.credential.update({ where: { id }, data: { name, type, data } });
  res.json(updated);
});

router.delete('/:id', requirePermission('credentials:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.credential.delete({ where: { id } });
  res.status(204).end();
});

export default router;
