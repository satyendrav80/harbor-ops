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

// Helper to convert Meta records to data object (masked)
function metaToMaskedData(metaRecords: any[]): any {
  const data: any = {};
  metaRecords.forEach((meta) => {
    data[meta.key] = '••••••••'; // Mask all values
  });
  return data;
}

// Helper to convert Meta records to data object (decrypted - for reveal)
function metaToDecryptedData(metaRecords: any[]): any {
  const data: any = {};
  metaRecords.forEach((meta) => {
    try {
      // Decrypt the encrypted value
      const decryptedValue = decrypt(meta.value);
      data[meta.key] = decryptedValue;
    } catch (error) {
      console.error(`Failed to decrypt meta value for key ${meta.key}:`, error);
      data[meta.key] = meta.value; // Fallback to raw value if decryption fails
    }
  });
  return data;
}

// Helper to save/update Meta records for a credential
async function saveCredentialMeta(credentialId: number, data: any, tx: any) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return;
  }

  // Process each key-value pair
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') {
      continue; // Skip empty values
    }

    // Encrypt the value
    const encryptedValue = encrypt(String(value));

    // Upsert the meta record
    await tx.meta.upsert({
      where: {
        resourceType_resourceId_key: {
          resourceType: 'credential',
          resourceId: credentialId,
          key: key,
        },
      },
      update: {
        value: encryptedValue,
        valueType: 'string', // Default to string for now
      },
      create: {
        resourceType: 'credential',
        resourceId: credentialId,
        key: key,
        value: encryptedValue,
        valueType: 'string',
      },
    });
  }
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
  const serverId = req.query.serverId ? Number(req.query.serverId) : undefined;
  const serviceId = req.query.serviceId ? Number(req.query.serviceId) : undefined;
  const credentialId = req.query.credentialId ? Number(req.query.credentialId) : undefined;
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = {};
  
  // Filter by credentialId if provided (exact match)
  if (credentialId) {
    searchConditions.id = credentialId;
  }
  
  // Add search conditions if not filtering by exact credentialId
  if (search && !credentialId) {
    searchConditions.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { type: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter by server or service if provided (and not filtering by exact credentialId)
  if (!credentialId) {
    if (serverId) {
      searchConditions.servers = {
        some: {
          serverId: Number(serverId),
        },
      };
    } else if (serviceId) {
      searchConditions.services = {
        some: {
          serviceId: Number(serviceId),
        },
      };
    }
  }

  const [items, total] = await Promise.all([
    prisma.credential.findMany({
      where: searchConditions,
      include: {
        servers: { include: { server: { select: { id: true, name: true, type: true } } } },
        services: { include: { service: { select: { id: true, name: true, port: true } } } },
        createdByUser: { select: { id: true, name: true, email: true } },
        updatedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.credential.count({ where: searchConditions }),
  ]);

  // Fetch meta records for all credentials
  const credentialIds = items.map((item) => item.id);
  const metaRecords = credentialIds.length > 0
    ? await prisma.meta.findMany({
        where: {
          resourceType: 'credential',
          resourceId: { in: credentialIds },
        },
      })
    : [];

  // Group meta records by credentialId
  const metaByCredentialId: Record<number, any[]> = {};
  metaRecords.forEach((meta) => {
    if (!metaByCredentialId[meta.resourceId]) {
      metaByCredentialId[meta.resourceId] = [];
    }
    metaByCredentialId[meta.resourceId].push(meta);
  });

  // Check if user can view full credential data (has view permission)
  const hasFullView = await hasCredentialsViewPermission(req);
  const processedItems = hasFullView 
    ? items.map((item) => ({
        ...item,
        data: metaToMaskedData(metaByCredentialId[item.id] || []), // Mask all values
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

router.post('/', requirePermission('credentials:create'), async (req: AuthRequest, res) => {
  const { name, type, data } = req.body;
  
  // Validate data is provided
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Credential data is required. Please add at least one key-value pair.' });
  }

  // Create credential with meta in a transaction
  const created = await prisma.$transaction(async (tx) => {
    const credential = await tx.credential.create({
      data: { 
        name, 
        type,
        createdBy: req.user?.id || null,
      },
    });

    // Save meta records (with encrypted values)
    await saveCredentialMeta(credential.id, data, tx);

    // Return credential with meta
    const metaRecords = await tx.meta.findMany({
      where: {
        resourceType: 'credential',
        resourceId: credential.id,
      },
    });

    return {
      ...credential,
      data: metaToMaskedData(metaRecords),
    };
  });

  res.status(201).json(mask(created));
});

router.get('/:id', requirePermission('credentials:view'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const item = await prisma.credential.findUnique({ 
    where: { id },
    include: {
      servers: { include: { server: { select: { id: true, name: true, type: true } } } },
      services: { include: { service: { select: { id: true, name: true, port: true } } } },
      createdByUser: { select: { id: true, name: true, email: true } },
      updatedByUser: { select: { id: true, name: true, email: true } },
    },
  });
  if (!item) return res.status(404).json({ error: 'Not found' });
  
  // Fetch meta records
  const metaRecords = await prisma.meta.findMany({
    where: {
      resourceType: 'credential',
      resourceId: id,
    },
  });

  const hasFullView = await hasCredentialsViewPermission(req);
  
  if (hasFullView) {
    // Always mask the encrypted data (never expose decrypted data in normal GET)
    const maskedItem = {
      ...item,
      data: metaToMaskedData(metaRecords),
    };
    res.json(maskedItem);
  } else {
    res.json(mask(item));
  }
});

router.put('/:id', requirePermission('credentials:update'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existingCredential = await prisma.credential.findUnique({ where: { id } });
  if (!existingCredential) {
    return res.status(404).json({ error: 'Credential not found' });
  }
  
  const { name, type, data } = req.body;
  
  // Update credential and meta in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Update credential basic info
    const credential = await tx.credential.update({ 
      where: { id }, 
      data: { 
        name: name !== undefined ? name : existingCredential.name,
        type: type !== undefined ? type : existingCredential.type,
        updatedBy: req.user?.id || null,
      } 
    });

    // Update meta records only if data is provided
    // If data is provided but some keys have masked values, only update the non-masked ones
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      // Get existing meta records
      const existingMeta = await tx.meta.findMany({
        where: {
          resourceType: 'credential',
          resourceId: id,
        },
      });

      const existingKeys = new Set(existingMeta.map(m => m.key));

      // Process each key in newData
      for (const [key, value] of Object.entries(data)) {
        // Skip if value is masked placeholder or empty (means keep existing)
        if (value === '••••••••' || value === '' || value === null || value === undefined) {
          // Keep existing encrypted value (don't change it)
          continue;
        }

        // Encrypt and upsert the new value
        const encryptedValue = encrypt(String(value));
        await tx.meta.upsert({
          where: {
            resourceType_resourceId_key: {
              resourceType: 'credential',
              resourceId: id,
              key: key,
            },
          },
          update: {
            value: encryptedValue,
          },
          create: {
            resourceType: 'credential',
            resourceId: id,
            key: key,
            value: encryptedValue,
            valueType: 'string',
          },
        });
      }

      // If a key exists in existing but not in newData, we keep it (partial update)
      // To delete keys, they would need to be explicitly passed as null/empty
    }

    // Return credential with updated meta
    const metaRecords = await tx.meta.findMany({
      where: {
        resourceType: 'credential',
        resourceId: id,
      },
    });

    return {
      ...credential,
      data: metaToMaskedData(metaRecords),
    };
  });
  
  res.json(mask(updated));
});

// Reveal credential data endpoint - requires credentials:reveal permission
router.get('/:id/reveal', requirePermission('credentials:reveal'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const item = await prisma.credential.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Credential not found' });
  
  try {
    // Fetch meta records
    const metaRecords = await prisma.meta.findMany({
      where: {
        resourceType: 'credential',
        resourceId: id,
      },
    });

    // Decrypt all meta values
    const decryptedData = metaToDecryptedData(metaRecords);
    res.json({ data: decryptedData });
  } catch (error) {
    console.error('Failed to decrypt credential data:', error);
    return res.status(500).json({ error: 'Failed to decrypt credential data' });
  }
});

router.delete('/:id', requirePermission('credentials:delete'), async (req, res) => {
  const id = Number(req.params.id);
  
  // Delete credential and related meta records in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete meta records first (cascade will handle this, but explicit is safer)
    await tx.meta.deleteMany({
      where: {
        resourceType: 'credential',
        resourceId: id,
      },
    });
    
    // Delete credential
    await tx.credential.delete({ where: { id } });
  });
  
  res.status(204).end();
});

export default router;
