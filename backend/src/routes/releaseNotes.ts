import { Router } from 'express';
import { PrismaClient, ReleaseStatus } from '@prisma/client';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { list, getMetadata } from '../controllers/releaseNotesController';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

/**
 * GET /release-notes/filter-metadata
 * Returns metadata about all filterable fields, relations, and supported operators
 * This enables the UI to dynamically build filter interfaces
 */
router.get('/filter-metadata', getMetadata);

/**
 * POST /release-notes/list
 * Advanced filtering endpoint with generic filter operators
 * 
 * Request body:
 * {
 *   filters?: Filter[],
 *   search?: string,
 *   page?: number,
 *   limit?: number,
 *   orderBy?: OrderByItem | OrderByItem[]
 * }
 * 
 * Filter structure supports nested AND/OR/NOT conditions:
 * {
 *   condition: "and" | "or" | "not",
 *   childs: [
 *     { key: "status", type: "STRING", operator: "in", value: ["pending", "deployed"] },
 *     { condition: "or", childs: [...] }
 *   ]
 * }
 */
router.post('/list', list);

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
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                type: true,
              },
            },
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
router.post('/services/:id/release-notes', requirePermission('release-notes:create'), async (req: AuthRequest, res) => {
  const serviceId = Number(req.params.id);
  const { note, publishDate } = req.body as { note: string; publishDate?: string };
  const created = await prisma.releaseNote.create({
    data: {
      serviceId,
      note,
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      createdBy: req.user?.id || null,
    },
  });
  res.status(201).json(created);
});

// POST /release-notes (create new release note)
router.post('/', requirePermission('release-notes:create'), async (req: AuthRequest, res) => {
  const { serviceId, note, publishDate, taskIds } = req.body as { 
    serviceId: number; 
    note: string; 
    publishDate?: string;
    taskIds?: number[];
  };
  
  const created = await prisma.$transaction(async (tx) => {
    const releaseNote = await tx.releaseNote.create({
      data: {
        serviceId: Number(serviceId),
        note,
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        createdBy: req.user?.id || null,
      },
    });

    // Add tasks if provided
    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      await tx.releaseNoteTask.createMany({
        data: taskIds.map((taskId) => ({
          releaseNoteId: releaseNote.id,
          taskId: Number(taskId),
        })),
        skipDuplicates: true,
      });
    }

    // Fetch with relations
    return tx.releaseNote.findUnique({
      where: { id: releaseNote.id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            port: true,
          },
        },
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                type: true,
              },
            },
          },
        },
      },
    });
  });
  
  res.status(201).json(created);
});

// PUT /release-notes/:id (only if pending)
router.put('/:id', requirePermission('release-notes:update'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.status !== ReleaseStatus.pending) {
    return res.status(400).json({ error: 'Can only edit pending release notes' });
  }
  const { note, publishDate, serviceId, taskIds } = req.body as { 
    note?: string; 
    publishDate?: string; 
    serviceId?: number;
    taskIds?: number[];
  };
  
  const updated = await prisma.$transaction(async (tx) => {
    const updateData: any = {
      updatedBy: req.user?.id || null,
    };
    if (note !== undefined) updateData.note = note;
    if (publishDate !== undefined) updateData.publishDate = new Date(publishDate);
    if (serviceId !== undefined) updateData.serviceId = Number(serviceId);
    
    await tx.releaseNote.update({ where: { id }, data: updateData });

    // Update tasks if provided
    if (taskIds !== undefined) {
      // Remove existing task associations
      await tx.releaseNoteTask.deleteMany({
        where: { releaseNoteId: id },
      });

      // Add new task associations
      if (Array.isArray(taskIds) && taskIds.length > 0) {
        await tx.releaseNoteTask.createMany({
          data: taskIds.map((taskId) => ({
            releaseNoteId: id,
            taskId: Number(taskId),
          })),
          skipDuplicates: true,
        });
      }
    }

    // Fetch with relations
    return tx.releaseNote.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            port: true,
          },
        },
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                type: true,
              },
            },
          },
        },
      },
    });
  });
  
  res.json(updated);
});

// POST /release-notes/:id/mark-deployed
router.post('/:id/mark-deployed', requirePermission('release-notes:deploy'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.releaseNote.update({ 
    where: { id }, 
    data: { 
      status: ReleaseStatus.deployed,
      deployedAt: new Date(),
      updatedBy: (req as AuthRequest).user?.id || null,
    } 
  });
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
