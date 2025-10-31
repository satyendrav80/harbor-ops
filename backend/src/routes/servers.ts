import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();
const router = Router();

// Helper to remove password from response (don't send it)
function removePassword(server: any) {
  if (!server) return server;
  const { password, ...rest } = server;
  return rest;
}

router.use(requireAuth);

router.get('/', requirePermission('servers:view'), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { publicIp: { contains: search, mode: 'insensitive' } },
          { privateIp: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [servers, total] = await Promise.all([
            prisma.server.findMany({
              where: searchConditions,
              include: {
                tags: { include: { tag: true } },
                credentials: { include: { credential: true } },
                domains: { include: { domain: true } },
              },
              orderBy: { createdAt: 'desc' },
              skip: offset,
              take: limit,
            }),
    prisma.server.count({ where: searchConditions }),
  ]);

  // Remove passwords from response
  const serversWithoutPassword = servers.map(removePassword);

  res.json({
    data: serversWithoutPassword,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.post('/', requirePermission('servers:create'), async (req, res) => {
  const { name, type, publicIp, privateIp, endpoint, port, sshPort, username, password, credentialIds } = req.body;
  const encryptedPassword = password ? encrypt(password) : null;
  
  const data: any = {
    name,
    type: type || 'os', // Default to 'os' if not provided
  };
  
  // OS and EC2: IP fields + SSH port + optional username/password
  if (type === 'os' || type === 'ec2') {
    data.publicIp = publicIp || null;
    data.privateIp = privateIp || null;
    data.sshPort = sshPort ? Number(sshPort) : null;
    data.username = username || null;
    data.endpoint = null;
    data.port = null;
  } 
  // RDS: endpoint + port + optional username/password
  else if (type === 'rds') {
    data.endpoint = endpoint || null;
    data.port = port ? Number(port) : null;
    data.username = username || null;
    data.publicIp = null;
    data.privateIp = null;
    data.sshPort = null;
  } 
  // Amplify, Lambda, ECS, Other: No IP, No port, no SSH port - only endpoint/metadata + optional username/password
  else {
    data.endpoint = endpoint || null;
    data.username = username || null;
    data.publicIp = null;
    data.privateIp = null;
    data.port = null;
    data.sshPort = null;
  }
  
  if (encryptedPassword) {
    data.password = encryptedPassword;
  }
  
  // Create server with credentials and domains if provided
  const created = await prisma.$transaction(async (tx) => {
    const server = await tx.server.create({ data });
    
    // Attach credentials if provided
    if (credentialIds && Array.isArray(credentialIds) && credentialIds.length > 0) {
      const credentialData = credentialIds.map((credId: number) => ({
        serverId: server.id,
        credentialId: Number(credId),
      }));
      await tx.serverCredential.createMany({ data: credentialData, skipDuplicates: true });
    }
    
    // Attach domains if provided
    if (domainIds && Array.isArray(domainIds) && domainIds.length > 0) {
      const domainData = domainIds.map((domainId: number) => ({
        serverId: server.id,
        domainId: Number(domainId),
      }));
      await tx.serverDomain.createMany({ data: domainData, skipDuplicates: true });
    }
    
    // Return server with credentials and domains
    return await tx.server.findUnique({
      where: { id: server.id },
      include: {
        tags: { include: { tag: true } },
        credentials: { include: { credential: true } },
        domains: { include: { domain: true } },
      },
    });
  });
  
  res.status(201).json(removePassword(created));
});

router.get('/:id', requirePermission('servers:view'), async (req, res) => {
  const id = Number(req.params.id);
  const server = await prisma.server.findUnique({ 
    where: { id },
    include: {
      tags: { include: { tag: true } },
      credentials: { include: { credential: true } },
      domains: { include: { domain: true } },
    },
  });
  if (!server) return res.status(404).json({ error: 'Not found' });
  res.json(removePassword(server));
});

// Reveal password endpoint - requires credentials:reveal permission
router.get('/:id/reveal-password', requirePermission('credentials:reveal'), async (req, res) => {
  const id = Number(req.params.id);
  const server = await prisma.server.findUnique({ where: { id } });
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  if (!server.password) {
    return res.json({ password: null });
  }

  try {
    const decryptedPassword = decrypt(server.password);
    res.json({ password: decryptedPassword });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to decrypt password' });
  }
});

router.put('/:id', requirePermission('servers:update'), async (req, res) => {
  const id = Number(req.params.id);
  const server = await prisma.server.findUnique({ where: { id } });
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  const { name, type, publicIp, privateIp, endpoint, port, sshPort, username, password, credentialIds, domainIds } = req.body;
  
  const updateData: any = {
    name,
  };

  // Update type if provided
  if (type !== undefined) {
    updateData.type = type;
  }
  
  const serverType = type || server.type;

  // OS and EC2: IP fields + SSH port + optional username/password
  if (serverType === 'os' || serverType === 'ec2') {
    updateData.publicIp = publicIp !== undefined ? (publicIp || null) : undefined;
    updateData.privateIp = privateIp !== undefined ? (privateIp || null) : undefined;
    updateData.endpoint = null; // Clear endpoint for OS/EC2 servers
    updateData.port = null; // Clear port for OS/EC2 servers
    updateData.sshPort = sshPort !== undefined ? (sshPort ? Number(sshPort) : null) : undefined;
    updateData.username = username !== undefined ? (username || null) : undefined;
  } 
  // RDS: endpoint + port + optional username/password
  else if (serverType === 'rds') {
    updateData.endpoint = endpoint !== undefined ? (endpoint || null) : undefined;
    updateData.port = port !== undefined ? (port ? Number(port) : null) : undefined;
    updateData.username = username !== undefined ? (username || null) : undefined;
    updateData.publicIp = null; // Clear IPs for RDS
    updateData.privateIp = null;
    updateData.sshPort = null; // Clear SSH port for RDS
  } 
  // Amplify, Lambda, ECS, Other: No IP, No port, no SSH port - only endpoint + optional username/password
  else {
    updateData.endpoint = endpoint !== undefined ? (endpoint || null) : undefined;
    updateData.username = username !== undefined ? (username || null) : undefined;
    updateData.publicIp = null; // Clear IPs
    updateData.privateIp = null;
    updateData.port = null; // Clear port
    updateData.sshPort = null; // Clear SSH port
  }

  // Only update password if provided
  if (password !== undefined && password !== null && password !== '') {
    updateData.password = encrypt(password);
  }

  // Update server, credentials, and domains in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Update server
    await tx.server.update({ where: { id }, data: updateData });
    
    // Update credentials if provided
    if (credentialIds !== undefined) {
      // Remove all existing credentials
      await tx.serverCredential.deleteMany({ where: { serverId: id } });
      
      // Add new credentials if provided
      if (Array.isArray(credentialIds) && credentialIds.length > 0) {
        const credentialData = credentialIds.map((credId: number) => ({
          serverId: id,
          credentialId: Number(credId),
        }));
        await tx.serverCredential.createMany({ data: credentialData, skipDuplicates: true });
      }
    }
    
    // Update domains if provided
    if (domainIds !== undefined) {
      // Remove all existing domains
      await tx.serverDomain.deleteMany({ where: { serverId: id } });
      
      // Add new domains if provided
      if (Array.isArray(domainIds) && domainIds.length > 0) {
        const domainData = domainIds.map((domainId: number) => ({
          serverId: id,
          domainId: Number(domainId),
        }));
        await tx.serverDomain.createMany({ data: domainData, skipDuplicates: true });
      }
    }
    
    // Return server with credentials and domains
    return await tx.server.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        credentials: { include: { credential: true } },
        domains: { include: { domain: true } },
      },
    });
  });
  
  res.json(removePassword(updated));
});

router.delete('/:id', requirePermission('servers:delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.server.delete({ where: { id } });
  res.status(204).end();
});

// Attach tags: POST /servers/:id/tags { tagIds: number[] }
router.post('/:id/tags', requirePermission('servers:update'), async (req, res) => {
  const id = Number(req.params.id);
  const { tagIds } = req.body as { tagIds: number[] };
  const data = (tagIds || []).map((tagId) => ({ serverId: id, tagId: Number(tagId) }));
  await prisma.serverTag.createMany({ data, skipDuplicates: true });
  const updated = await prisma.server.findUnique({ 
    where: { id }, 
    include: { tags: { include: { tag: true } } } 
  });
  res.json(updated ? removePassword(updated) : null);
});

// Detach tag: DELETE /servers/:id/tags/:tagId
router.delete('/:id/tags/:tagId', requirePermission('servers:update'), async (req, res) => {
  const id = Number(req.params.id);
  const tagId = Number(req.params.tagId);
  await prisma.serverTag.delete({ where: { serverId_tagId: { serverId: id, tagId } } });
  res.status(204).end();
});

export default router;
