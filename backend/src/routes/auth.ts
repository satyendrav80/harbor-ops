import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

function signToken(payload: object): string {
  const secret = process.env.JWT_SECRET || 'dev_secret';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const secret = process.env.JWT_SECRET || 'dev_secret';
    const payload = jwt.verify(token, secret) as any;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });
  return res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ sub: user.id, email: user.email });
  return res.json({ token });
});

router.get('/me', authMiddleware, async (req: any, res) => {
  const userId = req.user?.sub as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, name: true, createdAt: true, updatedAt: true },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json(user);
});

router.patch('/profile', authMiddleware, async (req: any, res) => {
  const userId = req.user?.sub as string;
  const { name, email, username } = req.body;

  // Validate input
  if (!name && !email && username === undefined) {
    return res.status(400).json({ error: 'At least one field (name, email, or username) is required' });
  }

  // Check if email is being changed and if it's already taken
  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ error: 'Email already in use' });
    }
  }

  // Get current user to use email as default username
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if username is being changed and if it's already taken
  let finalUsername: string | null = null;
  if (username !== undefined) {
    if (username && username.trim() !== '') {
      // Username must be alphanumeric with underscores and hyphens, 3-30 characters
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
      if (!usernameRegex.test(username.trim())) {
        return res.status(400).json({ error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens' });
      }
      const existingUser = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      finalUsername = username.trim();
    } else {
      // If empty, use email as default username
      finalUsername = email || currentUser.email;
    }
  }

  // Update user
  const updateData: { name?: string | null; email?: string; username?: string | null } = {};
  if (name !== undefined) updateData.name = name || null;
  if (email !== undefined) updateData.email = email;
  if (username !== undefined) updateData.username = finalUsername;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, username: true, name: true, createdAt: true, updatedAt: true },
    });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/change-password', authMiddleware, async (req: any, res) => {
  const userId = req.user?.sub as string;
  const { currentPassword, newPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  // Get user and verify current password
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Hash new password and update
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
