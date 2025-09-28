import { Router } from 'express';
import { PrismaClient, ReleaseStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

// GET /release-notes?status=pending
router.get('/', async (req, res) => {
  const { status } = req.query as { status?: string };
  const where: any = {};
  if (status === 'pending') where.status = ReleaseStatus.pending;
  const items = await prisma.releaseNote.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(items);
});

// POST /services/:id/release-notes
router.post('/services/:id/release-notes', async (req, res) => {
  const serviceId = Number(req.params.id);
  const { note } = req.body as { note: string };
  const created = await prisma.releaseNote.create({ data: { serviceId, note } });
  res.status(201).json(created);
});

// PUT /release-notes/:id (only if pending)
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== ReleaseStatus.pending) return res.status(400).json({ error: 'Cannot edit deployed note' });
  const { note } = req.body as { note: string };
  const updated = await prisma.releaseNote.update({ where: { id }, data: { note } });
  res.json(updated);
});

// POST /release-notes/:id/mark-deployed
router.post('/:id/mark-deployed', async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.releaseNote.update({ where: { id }, data: { status: ReleaseStatus.deployed } });
  res.json(updated);
});

export default router;
