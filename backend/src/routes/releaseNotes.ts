import { Router } from 'express';
import { ReleaseStatus, TaskStatus } from '@prisma/client';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { list, getMetadata } from '../controllers/releaseNotesController';
import { list as listService } from '../services/releaseNotes';
import { createNotification } from '../services/notifications';
import { emitEntityChanged } from '../socket/socket';
import { randomBytes } from 'crypto';
import { prisma } from '../dataStore';
const router = Router();

/**
 * Validate that all task IDs have status 'completed' or 'testing'
 */
async function validateTaskStatuses(taskIds: number[]): Promise<{ valid: boolean; invalidTasks?: Array<{ id: number; status: string }> }> {
  if (!taskIds || taskIds.length === 0) {
    return { valid: true };
  }

  const tasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      deleted: false,
    },
    select: {
      id: true,
      status: true,
      title: true,
    },
  });

  const invalidTasks = tasks.filter(
    (task) => task.status !== TaskStatus.completed && task.status !== TaskStatus.testing
  );

  if (invalidTasks.length > 0) {
    return {
      valid: false,
      invalidTasks: invalidTasks.map((t) => ({ id: t.id, status: t.status })),
    };
  }

  // Check if all provided task IDs exist
  const foundTaskIds = new Set(tasks.map((t) => t.id));
  const missingTaskIds = taskIds.filter((id) => !foundTaskIds.has(id));
  if (missingTaskIds.length > 0) {
    return {
      valid: false,
      invalidTasks: missingTaskIds.map((id) => ({ id, status: 'not_found' })),
    };
  }

  return { valid: true };
}

/**
 * Validate that all tasks in a release note are completed
 */
async function validateAllTasksCompleted(releaseNoteId: number): Promise<{ valid: boolean; incompleteTasks?: Array<{ id: number; title: string; status: string }> }> {
  const releaseNote = await prisma.releaseNote.findUnique({
    where: { id: releaseNoteId },
    include: {
      tasks: {
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!releaseNote) {
    return { valid: false };
  }

  if (releaseNote.tasks.length === 0) {
    return { valid: true };
  }

  const incompleteTasks = releaseNote.tasks
    .filter((rt) => rt.task.status !== TaskStatus.completed)
    .map((rt) => ({
      id: rt.task.id,
      title: rt.task.title,
      status: rt.task.status,
    }));

  if (incompleteTasks.length > 0) {
    return {
      valid: false,
      incompleteTasks,
    };
  }

  return { valid: true };
}

async function notifyReleaseNoteDeployUsers(releaseNote: any, createdByUserId?: string | null) {
  const deployUsers = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          OR: [
            { role: { name: 'admin' } },
            {
              role: {
                permissions: {
                  some: {
                    permission: {
                      name: {
                        in: ['release-notes:deploy', 'release-notes:manage'],
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
    select: { id: true },
  });

  const notified = new Set<string>();
  const serviceName = releaseNote?.service?.name || 'a service';

  await Promise.all(
    deployUsers.map((user) => {
      // Skip the creator if they have deploy access
      if (createdByUserId && user.id === createdByUserId) {
        return null;
      }
      if (!user.id || notified.has(user.id)) return null;
      notified.add(user.id);
      return createNotification({
        userId: user.id,
        type: 'release_note_created',
        title: 'New release note created',
        message: `A release note for ${serviceName} was created`,
        releaseNoteId: releaseNote.id,
      }).catch(() => null);
    })
  );
}

// Public route - no auth required (handled by skipAuthForPaths middleware)
// GET /release-notes/public/:token (public view - no auth required)
router.get('/public/:token', async (req, res) => {
  const { token } = req.params;
  
  const shareLink = await prisma.releaseNoteShareLink.findUnique({
    where: { shareToken: token },
  });

  if (!shareLink) {
    return res.status(404).json({ error: 'Share link not found or expired' });
  }

  // Check if expired
  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return res.status(410).json({ error: 'Share link has expired' });
  }

  // Update view count and last viewed
  await prisma.releaseNoteShareLink.update({
    where: { id: shareLink.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  // Fetch release notes with filters
  const filters = shareLink.filters as any;
  
  // Use the list service to get filtered release notes
  const context = {
    body: { 
      filters: filters || undefined,
      page: 1,
      limit: 100, // Get more results for public view
    },
    query: {},
    params: {},
    headers: {},
  };

  try {
    const result = await listService(context);
    res.json({
      shareLink: {
        id: shareLink.id,
        createdAt: shareLink.createdAt,
        expiresAt: shareLink.expiresAt,
        viewCount: shareLink.viewCount + 1, // Include the increment
      },
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch release notes' });
  }
});

router.use(requireAuth);

// Broadcast release note changes to connected clients after successful mutations
router.use((req, res, next) => {
  res.on('finish', () => {
    const isReadOnly =
      req.method === 'GET' ||
      req.path.includes('/list') ||
      req.path.includes('filter-metadata');
    if (!isReadOnly && res.statusCode < 400) {
      try {
        emitEntityChanged('release-note');
      } catch (err) {
        // ignore socket emission failures
      }
    }
  });
  next();
});

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

// Share links routes - must be defined before /:id route to avoid route conflicts
// POST /release-notes/share-links (create share link)
router.post('/share-links', requirePermission('release-notes:view'), async (req: AuthRequest, res) => {
  const { filters, expiresInDays } = req.body as { 
    filters?: any; 
    expiresInDays?: number | null; 
  };

  // Validate that at least one filter is present
  if (!filters || (typeof filters === 'object' && Object.keys(filters).length === 0)) {
    return res.status(400).json({ error: 'At least one filter is required to create a share link' });
  }

  // Generate a secure random token
  const shareToken = randomBytes(32).toString('hex');
  
  // Calculate expiry date (null means never expires)
  let expiresAt: Date | null = null;
  if (expiresInDays !== null && expiresInDays !== undefined) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  const shareLink = await prisma.releaseNoteShareLink.create({
    data: {
      shareToken,
      filters: filters || null,
      expiresAt,
      createdBy: req.user?.id || null,
    },
  });

  res.status(201).json(shareLink);
});

// GET /release-notes/share-links (list user's share links)
router.get('/share-links', requirePermission('release-notes:view'), async (req: AuthRequest, res) => {
  const shareLinks = await prisma.releaseNoteShareLink.findMany({
    where: {
      createdBy: req.user?.id || undefined,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json(shareLinks);
});

// DELETE /release-notes/share-links/:id (delete share link)
router.delete('/share-links/:id', requirePermission('release-notes:view'), async (req: AuthRequest, res) => {
  const id = req.params.id;
  const shareLink = await prisma.releaseNoteShareLink.findUnique({ where: { id } });
  
  if (!shareLink) {
    return res.status(404).json({ error: 'Share link not found' });
  }

  // Only allow creator to delete
  if (shareLink.createdBy !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.releaseNoteShareLink.delete({ where: { id } });
  res.status(204).end();
});

// GET /release-notes/:id (get single release note)
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid release note ID' });
  }

  const releaseNote = await prisma.releaseNote.findUnique({
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
              description: true,
              status: true,
              type: true,
              sprint: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!releaseNote) {
    return res.status(404).json({ error: 'Release note not found' });
  }

  res.json(releaseNote);
});

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
                description: true,
                status: true,
                type: true,
                sprint: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
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
  
  // Validate task statuses if tasks are provided
  if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
    const validation = await validateTaskStatuses(taskIds);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid task statuses',
        message: 'Only tasks with status "completed" or "testing" can be added to release notes',
        invalidTasks: validation.invalidTasks,
      });
    }
  }
  
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
                description: true,
                status: true,
                type: true,
                sprint: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  try {
    await notifyReleaseNoteDeployUsers(created, req.user?.id);
  } catch (err) {
    // ignore notification failures
  }

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
  
  // Validate task statuses if tasks are provided
  if (taskIds !== undefined && Array.isArray(taskIds) && taskIds.length > 0) {
    const validation = await validateTaskStatuses(taskIds);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid task statuses',
        message: 'Only tasks with status "completed" or "testing" can be added to release notes',
        invalidTasks: validation.invalidTasks,
      });
    }
  }
  
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
                description: true,
                status: true,
                type: true,
                sprint: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
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
  const currentUserId = (req as AuthRequest).user?.id || null;
  
  const existing = await prisma.releaseNote.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  
  // Validate that all tasks are completed
  const validation = await validateAllTasksCompleted(id);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Cannot deploy',
      message: 'All tasks must be completed before deployment',
      incompleteTasks: validation.incompleteTasks,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const releaseNote = await tx.releaseNote.update({
      where: { id },
      data: {
        status: ReleaseStatus.deployed,
        deployedAt: new Date(),
        updatedBy: currentUserId,
      },
      include: {
        service: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                createdBy: true,
                assignedTo: true,
                testerId: true,
              },
            },
          },
        },
      },
    });

    return releaseNote;
  });

  const serviceName = updated.service?.name || 'a service';

  try {
    // Notify release note creator (if different from deployer)
    if (updated.createdBy && updated.createdBy !== currentUserId) {
      await createNotification({
        userId: updated.createdBy,
        type: 'release_note_deployed',
        title: 'Release note deployed',
        message: `Release note for ${serviceName} was deployed`,
        releaseNoteId: id,
      }).catch(() => null);
    }

    // Aggregate notifications by role to avoid spamming users
    const assignedMap = new Map<string, string[]>(); // userId -> task titles
    const testerMap = new Map<string, string[]>(); // userId -> task titles

    updated.tasks.forEach((rt) => {
      const title = rt.task?.title || 'Task';
      if (rt.task?.assignedTo) {
        if (!assignedMap.has(rt.task.assignedTo)) assignedMap.set(rt.task.assignedTo, []);
        assignedMap.get(rt.task.assignedTo)!.push(title);
      }
      if (rt.task?.testerId) {
        if (!testerMap.has(rt.task.testerId)) testerMap.set(rt.task.testerId, []);
        testerMap.get(rt.task.testerId)!.push(title);
      }
    });

    // Notify assignees
    await Promise.all(
      Array.from(assignedMap.entries()).map(([userId, titles]) =>
        createNotification({
          userId,
          type: 'task_deployed',
          title: 'Tasks deployed',
          message: `Deployed: ${titles.join(', ')}`,
          releaseNoteId: id,
        }).catch(() => null)
      )
    );

    // Notify testers
    await Promise.all(
      Array.from(testerMap.entries()).map(([userId, titles]) =>
        createNotification({
          userId,
          type: 'task_deployed',
          title: 'Tasks deployed',
          message: `Deployed: ${titles.join(', ')}`,
          releaseNoteId: id,
        }).catch(() => null)
      )
    );
  } catch (err) {
    // ignore notification failures
  }

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
  
  // Validate that all tasks are completed
  const validation = await validateAllTasksCompleted(id);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Cannot start deployment',
      message: 'All tasks must be completed before deployment can be started',
      incompleteTasks: validation.incompleteTasks,
    });
  }
  
  const updated = await prisma.releaseNote.update({ 
    where: { id }, 
    data: { 
      status: ReleaseStatus.deployment_started,
      updatedBy: (req as AuthRequest).user?.id || null,
    } 
  });
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
