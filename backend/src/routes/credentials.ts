import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

function mask(cred: any) {
  return { ...cred, data: 'hidden' };
}

// Helper to mask sensitive fields in credential data (for responses)
function maskCredentialData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const masked = { ...data };
  // Mask common password/secret fields
  const sensitiveFields = ['password', 'secret', 'apiKey', 'token', 'privateKey', 'accessToken'];
  sensitiveFields.forEach((field) => {
    if (masked[field]) {
      masked[field] = '••••••••';
    }
  });
  return masked;
}

// Helper to encrypt sensitive fields in credential data (before saving)
function encryptCredentialData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const encrypted = { ...data };
  // Encrypt common password/secret fields
  const sensitiveFields = ['password', 'secret', 'apiKey', 'token', 'privateKey', 'accessToken'];
  sensitiveFields.forEach((field) => {
    if (encrypted[field] && encrypted[field] !== '••••••••') {
      // Only encrypt if not already masked (to avoid re-encrypting)
      try {
        encrypted[field] = encrypt(String(encrypted[field]));
      } catch (error) {
        console.error(`Failed to encrypt field ${field}:`, error);
      }
    }
  });
  return encrypted;
}

// Helper to decrypt sensitive fields in credential data
function decryptCredentialData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const decrypted = { ...data };
  // Decrypt common password/secret fields
  const sensitiveFields = ['password', 'secret', 'apiKey', 'token', 'privateKey', 'accessToken'];
  sensitiveFields.forEach((field) => {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field] !== '••••••••') {
      try {
        const decryptedValue = decrypt(decrypted[field]);
        if (decryptedValue) {
          decrypted[field] = decryptedValue;
        }
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
      }
    }
  });
  return decrypted;
}

async function hasCredentialsViewPermission(req: AuthRequest): Promise<boolean> {
  if (!req.user) return false;
  const userRoles = await prisma.userRole.findMany({
    where: { userId: req.user.id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  // Admin role bypasses permission checks
  if (userRoles.some((ur) => ur.role.name === 'admin')) {
    return true;
  }
  // Check for credentials:view or credentials:manage
  const hasView = userRoles.some((ur) => ur.role.permissions.some((rp) => rp.permission.name === 'credentials:view'));
  const hasManage = userRoles.some((ur) => ur.role.permissions.some((rp) => rp.permission.name === 'credentials:manage'));
  return hasView || hasManage;
}

router.get('/', requirePermission('credentials:view'), async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.credential.findMany({
      where: searchConditions,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.credential.count({ where: searchConditions }),
  ]);

  // Check if user can view full credential data (has view permission)
  const hasFullView = await hasCredentialsViewPermission(req);
  const processedItems = hasFullView 
    ? items.map((item) => ({
        ...item,
        data: maskCredentialData(item.data as any), // Mask sensitive fields
      }))
    : items.map(mask);
  
  res.json({
    data: processedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/', requirePermission('credentials:create'), async (req, res) => {
  const { name, type, data } = req.body;
  const encryptedData = encryptCredentialData(data);
  const created = await prisma.credential.create({ 
    data: { name, type, data: encryptedData } 
  });
  res.json(mask(created));
});

router.get('/:id', requirePermission('credentials:view'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const item = await prisma.credential.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  const hasFullView = await hasCredentialsViewPermission(req);
  
  if (hasFullView) {
    // Mask sensitive fields in response (not decrypted yet)
    const maskedItem = {
      ...item,
      data: maskCredentialData(item.data as any),
    };
    res.json(maskedItem);
  } else {
    res.json(mask(item));
  }
});

router.put('/:id', requirePermission('credentials:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, type, data } = req.body;
  const encryptedData = encryptCredentialData(data);
  const updated = await prisma.credential.update({ 
    where: { id }, 
    data: { name, type, data: encryptedData } 
  });
  res.json(mask(updated));
});

// Reveal credential data endpoint - requires credentials:reveal permission
router.get('/:id/reveal', requirePermission('credentials:reveal'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const item = await prisma.credential.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Credential not found' });
  
  try {
    const decryptedData = decryptCredentialData(item.data);
    res.json({ data: decryptedData });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to decrypt credential data' });
  }
});

router.delete('/:id', requirePermission('credentials:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.credential.delete({ where: { id } });
  res.status(204).end();
});

export default router;
