import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const secret = process.env.JWT_SECRET || 'dev_secret';
    const payload = jwt.verify(token, secret) as any;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requirePermission(permissionName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userRoles = await prisma.userRole.findMany({
      where: { userId: req.user.id },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    // Admin role bypasses permission checks
    if (userRoles.some((ur) => ur.role.name === 'admin')) {
      return next();
    }
    const has = userRoles.some((ur) => ur.role.permissions.some((rp) => rp.permission.name === permissionName));
    if (!has) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

export async function requireApprovedUser(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const secret = process.env.JWT_SECRET || 'dev_secret';
    const payload: any = jwt.verify(token, secret);
    req.user = { id: payload.sub, email: payload.email };
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { status: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Your account has been blocked. Please contact an administrator.' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Your account is pending approval. Please wait for an administrator to approve your account.' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
