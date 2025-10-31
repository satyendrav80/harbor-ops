import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('services:view'), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const include = (req.query.include as string | undefined) ?? '';
  const offset = (page - 1) * limit;
  const includeRelations = include.split(',').includes('relations');

  // Build search conditions
  const searchConditions: any = search
    ? {
        name: { contains: search, mode: 'insensitive' },
      }
    : {};

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where: searchConditions,
      include: includeRelations
        ? {
            server: true,
            credential: true,
            tags: { include: { tag: true } },
            releaseNotes: true,
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.service.count({ where: searchConditions }),
  ]);

  res.json({
    data: services,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/', requirePermission('services:create'), async (req, res) => {
  const { name, port, serverId, credentialId } = req.body;
  const created = await prisma.service.create({ data: { name, port: Number(port), serverId: Number(serverId), credentialId: credentialId ? Number(credentialId) : null } });
  res.status(201).json(created);
});

router.get('/:id', requirePermission('services:view'), async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.service.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', requirePermission('services:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, port, serverId, credentialId } = req.body;
  const updated = await prisma.service.update({ where: { id }, data: { name, port: Number(port), serverId: Number(serverId), credentialId: credentialId ? Number(credentialId) : null } });
  res.json(updated);
});

router.delete('/:id', requirePermission('services:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.service.delete({ where: { id } });
  res.status(204).end();
});

// Attach tags: POST /services/:id/tags { tagIds: number[] }
router.post('/:id/tags', requirePermission('services:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { tagIds } = req.body as { tagIds: number[] };
  const data = (tagIds || []).map((tagId) => ({ serviceId: id, tagId: Number(tagId) }));
  await prisma.serviceTag.createMany({ data, skipDuplicates: true });
  const updated = await prisma.service.findUnique({ where: { id }, include: { tags: true } });
  res.json(updated);
});

// Detach tag: DELETE /services/:id/tags/:tagId
router.delete('/:id/tags/:tagId', requirePermission('services:update'), async (req, res) => {
  const id = Number(req.params.id);
  const tagId = Number(req.params.tagId);
  await prisma.serviceTag.delete({ where: { serviceId_tagId: { serviceId: id, tagId } } });
  res.status(204).end();
});

export default router;
