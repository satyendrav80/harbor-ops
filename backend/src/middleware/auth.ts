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
    // Set x-user-id header for use in services via RequestContext
    (req.headers as any)['x-user-id'] = req.user.id;
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
    
    // Extract resource from permission name (e.g., "groups:view" -> "groups")
    const [resource] = permissionName.split(':');
    const managePermission = `${resource}:manage`;
    
    // Check if user has the specific permission or the manage permission for the resource
    const hasSpecific = userRoles.some((ur) => 
      ur.role.permissions.some((rp) => rp.permission.name === permissionName)
    );
    const hasManage = userRoles.some((ur) => 
      ur.role.permissions.some((rp) => rp.permission.name === managePermission)
    );
    
    if (!hasSpecific && !hasManage) return res.status(403).json({ error: 'Forbidden' });
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
    // Set x-user-id header for use in services via RequestContext
    (req.headers as any)['x-user-id'] = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { status: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Your account has been blocked. Please contact an administrator.' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Your account is pending approval. Please wait for an administrator to approve your account.' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware wrapper that conditionally skips authentication for specific paths
 * @param paths - Array of path patterns to skip auth for (supports Express path patterns)
 *                 Paths are relative to the router mount point
 * @param authMiddleware - The authentication middleware to apply conditionally
 */
export function skipAuthForPaths(paths: string[], authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void | Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check if the current path matches any of the skip patterns
    // req.path is relative to the mount point when inside a router
    const currentPath = req.path;
    const shouldSkip = paths.some(pattern => {
      // Convert Express pattern to regex
      // Pattern like "/public/:token" should match "/public/abc123"
      const regexPattern = pattern
        .replace(/\//g, '\\/')
        .replace(/:(\w+)/g, '[^/]+')  // Replace :param with [^/]+
        .replace(/\*/g, '.*');        // Replace * with .*
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(currentPath);
    });

    if (shouldSkip) {
      // Skip authentication for this path
      return next();
    }

    // Apply authentication middleware for other paths
    return authMiddleware(req, res, next);
  };
}
