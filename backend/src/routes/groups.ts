import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const items = await prisma.group.findMany({ include: { items: true } });
  res.json(items);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  const created = await prisma.group.create({ data: { name } });
  res.status(201).json(created);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.group.findUnique({ where: { id }, include: { items: true } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const updated = await prisma.group.update({ where: { id }, data: { name } });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.group.delete({ where: { id } });
  res.status(204).end();
});

export default router;
