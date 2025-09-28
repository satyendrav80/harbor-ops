import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const servers = await prisma.server.findMany();
  res.json(servers);
});

router.post('/', async (req, res) => {
  const { name, publicIp, privateIp, sshPort, username, password } = req.body;
  const created = await prisma.server.create({ data: { name, publicIp, privateIp, sshPort: Number(sshPort), username, password } });
  res.status(201).json(created);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const server = await prisma.server.findUnique({ where: { id } });
  if (!server) return res.status(404).json({ error: 'Not found' });
  res.json(server);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, publicIp, privateIp, sshPort, username, password } = req.body;
  const updated = await prisma.server.update({ where: { id }, data: { name, publicIp, privateIp, sshPort: Number(sshPort), username, password } });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.server.delete({ where: { id } });
  res.status(204).end();
});

export default router;
