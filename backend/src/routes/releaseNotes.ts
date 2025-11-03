import { Router } from 'express';
import { PrismaClient, ReleaseStatus } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

// GET /release-notes?status=pending&serviceId=123
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const { status, serviceId } = req.query as { status?: string; serviceId?: string };
  const offset = (page - 1) * limit;

  const where: any = {};
  if (status === 'pending') where.status = ReleaseStatus.pending;
  if (status === 'deployed') where.status = ReleaseStatus.deployed;
  if (status === 'deployment_started') where.status = ReleaseStatus.deployment_started;
  
  // Filter by serviceId if provided
  if (serviceId) {
    where.serviceId = Number(serviceId);
  }

  // Build search conditions
  if (search) {
    where.note = { contains: search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.releaseNote.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            port: true,
          },
        },
      },
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
  const { note, publishDate } = req.body as { note: string; publishDate?: string };
  const created = await prisma.releaseNote.create({
    data: {
      serviceId,
      note,
      publishDate: publishDate ? new Date(publishDate) : new Date(),
    },
  });
  res.status(201).json(created);
});

// POST /release-notes (create new release note)
router.post('/', requirePermission('release-notes:create'), async (req, res) => {
  const { serviceId, note, publishDate } = req.body as { serviceId: number; note: string; publishDate?: string };
  const created = await prisma.releaseNote.create({
    data: {
      serviceId: Number(serviceId),
      note,
      publishDate: publishDate ? new Date(publishDate) : new Date(),
    },
  });
  res.status(201).json(created);
});

// PUT /release-notes/:id (only if pending)
router.put('/:id', requirePermission('release-notes:update'), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== ReleaseStatus.pending) {
    return res.status(400).json({ error: 'Can only edit pending release notes' });
  }
  const { note, publishDate } = req.body as { note?: string; publishDate?: string };
  const updateData: any = {};
  if (note !== undefined) updateData.note = note;
  if (publishDate !== undefined) updateData.publishDate = new Date(publishDate);
  const updated = await prisma.releaseNote.update({ where: { id }, data: updateData });
  res.json(updated);
});

// POST /release-notes/:id/mark-deployed
router.post('/:id/mark-deployed', requirePermission('release-notes:deploy'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.releaseNote.update({ where: { id }, data: { status: ReleaseStatus.deployed } });
  res.json(updated);
});

// POST /release-notes/:id/mark-deployment-started
router.post('/:id/mark-deployment-started', requirePermission('release-notes:deploy'), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== ReleaseStatus.pending) {
    return res.status(400).json({ error: 'Can only mark pending notes as deployment started' });
  }
  const updated = await prisma.releaseNote.update({ where: { id }, data: { status: ReleaseStatus.deployment_started } });
  res.json(updated);
});

// DELETE /release-notes/:id (only if pending)
router.delete('/:id', requirePermission('release-notes:delete'), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== ReleaseStatus.pending) {
    return res.status(400).json({ error: 'Can only delete pending release notes' });
  }
  await prisma.releaseNote.delete({ where: { id } });
  res.status(204).end();
});

export default router;
