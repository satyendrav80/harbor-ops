import { Router } from 'express';
import { PrismaClient, ReleaseStatus } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

// GET /release-notes?status=pending
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const { status } = req.query as { status?: string };
  const offset = (page - 1) * limit;

  const where: any = {};
  if (status === 'pending') where.status = ReleaseStatus.pending;

  // Build search conditions
  if (search) {
    where.note = { contains: search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.releaseNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.releaseNote.count({ where }),
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

// POST /services/:id/release-notes
router.post('/services/:id/release-notes', requirePermission('release-notes:create'), async (req, res) => {
  const serviceId = Number(req.params.id);
  const { note } = req.body as { note: string };
  const created = await prisma.releaseNote.create({ data: { serviceId, note } });
  res.status(201).json(created);
});

// PUT /release-notes/:id (only if pending)
router.put('/:id', requirePermission('release-notes:update'), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== ReleaseStatus.pending) return res.status(400).json({ error: 'Cannot edit deployed note' });
  const { note } = req.body as { note: string };
  const updated = await prisma.releaseNote.update({ where: { id }, data: { note } });
  res.json(updated);
});

// POST /release-notes/:id/mark-deployed
router.post('/:id/mark-deployed', requirePermission('release-notes:update'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.releaseNote.update({ where: { id }, data: { status: ReleaseStatus.deployed } });
  res.json(updated);
});

export default router;
