import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

// Get all domains
router.get('/', requirePermission('domains:view'), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = search
    ? {
        name: { contains: search, mode: 'insensitive' },
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.domain.findMany({
      where: searchConditions,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.domain.count({ where: searchConditions }),
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

// Create a new domain
router.post('/', requirePermission('domains:create'), async (req, res) => {
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Domain name is required' });
  }
  
  try {
    const created = await prisma.domain.create({ 
      data: { name: name.trim() } 
    });
    res.status(201).json(created);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Domain already exists' });
    }
    return res.status(400).json({ error: 'Failed to create domain' });
  }
});

// Get a single domain
router.get('/:id', requirePermission('domains:view'), async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.domain.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Update a domain
router.put('/:id', requirePermission('domains:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Domain name is required' });
  }
  
  try {
    const updated = await prisma.domain.update({ 
      where: { id }, 
      data: { name: name.trim() } 
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Domain already exists' });
    }
    return res.status(400).json({ error: 'Failed to update domain' });
  }
});

// Delete a domain
router.delete('/:id', requirePermission('domains:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.domain.delete({ where: { id } });
  res.status(204).end();
});

export default router;

