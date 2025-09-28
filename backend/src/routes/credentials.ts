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
  const items = await prisma.credential.findMany();
  const hasPerm = (await requireHasPermission(req.user?.id, 'view_cred'));
  res.json(hasPerm ? items : items.map(mask));
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
