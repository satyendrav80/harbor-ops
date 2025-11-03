import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('tags:view'), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { value: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.tag.findMany({
      where: searchConditions,
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.tag.count({ where: searchConditions }),
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

router.post('/', requirePermission('tags:create'), async (req: AuthRequest, res) => {
  const { name, value, color } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Tag name is required' });
  }
  
  try {
    // Normalize color: trim and convert empty/whitespace strings to null
    const normalizedColor = color && typeof color === 'string' && color.trim() ? color.trim() : null;
    
    const created = await prisma.tag.create({ 
      data: { 
        name: name.trim(),
        value: value ? value.trim() : null,
        color: normalizedColor,
        createdBy: req.user?.id || null,
      } 
    });
    res.status(201).json(created);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tag with this name and value already exists' });
    }
    return res.status(400).json({ error: 'Failed to create tag' });
  }
});

router.get('/:id', requirePermission('tags:view'), async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.tag.findUnique({ 
    where: { id },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      updatedByUser: { select: { id: true, name: true, email: true } },
    },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/:id', requirePermission('tags:update'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { name, value, color } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Tag name is required' });
  }
  
  try {
    // Normalize color: if provided, trim and convert empty/whitespace strings to null
    // If not provided (undefined), don't update the field
    const normalizedColor = color !== undefined 
      ? (color && typeof color === 'string' && color.trim() ? color.trim() : null)
      : undefined;
    
    const updated = await prisma.tag.update({ 
      where: { id }, 
      data: { 
        name: name.trim(),
        value: value ? value.trim() : null,
        color: normalizedColor,
        updatedBy: req.user?.id || null,
      } 
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tag with this name and value already exists' });
    }
    return res.status(400).json({ error: 'Failed to update tag' });
  }
});

router.delete('/:id', requirePermission('tags:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.tag.delete({ where: { id } });
  res.status(204).end();
});

export default router;
