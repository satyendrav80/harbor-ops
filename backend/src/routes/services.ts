import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const items = await prisma.service.findMany();
  res.json(items);
});

router.post('/', async (req, res) => {
  const { name, port, serverId, credentialId } = req.body;
  const created = await prisma.service.create({ data: { name, port: Number(port), serverId: Number(serverId), credentialId: credentialId ? Number(credentialId) : null } });
  res.status(201).json(created);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.service.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, port, serverId, credentialId } = req.body;
  const updated = await prisma.service.update({ where: { id }, data: { name, port: Number(port), serverId: Number(serverId), credentialId: credentialId ? Number(credentialId) : null } });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.service.delete({ where: { id } });
  res.status(204).end();
});

// Attach tags: POST /services/:id/tags { tagIds: number[] }
router.post('/:id/tags', async (req, res) => {
  const id = Number(req.params.id);
  const { tagIds } = req.body as { tagIds: number[] };
  const data = (tagIds || []).map((tagId) => ({ serviceId: id, tagId: Number(tagId) }));
  await prisma.serviceTag.createMany({ data, skipDuplicates: true });
  const updated = await prisma.service.findUnique({ where: { id }, include: { tags: true } });
  res.json(updated);
});

// Detach tag: DELETE /services/:id/tags/:tagId
router.delete('/:id/tags/:tagId', async (req, res) => {
  const id = Number(req.params.id);
  const tagId = Number(req.params.tagId);
  await prisma.serviceTag.delete({ where: { serviceId_tagId: { serviceId: id, tagId } } });
  res.status(204).end();
});

export default router;
