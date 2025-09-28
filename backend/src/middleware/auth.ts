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
    const has = userRoles.some((ur) => ur.role.permissions.some((rp) => rp.permission.name === permissionName));
    if (!has) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
