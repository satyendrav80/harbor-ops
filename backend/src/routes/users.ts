import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS, isSystemPermission, getActionsForResource } from '../constants/permissions';
import { logAudit, getChanges, getRequestMetadata } from '../utils/audit';
import { AuditResourceType, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

// Get all users with their roles
router.get('/users', async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || '';
  const offset = (page - 1) * limit;

  // Build search conditions
  const searchConditions: any = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...searchConditions,
        deleted: false, // Exclude deleted records
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                value: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    }),
    prisma.user.count({ where: { ...searchConditions, deleted: false } }),
  ]);

  // Transform users to include tags as array
  const processedUsers = users.map((user) => ({
    ...user,
    tags: user.tags.map((ut: any) => ut.tag),
  }));

  res.json({
    data: processedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get a single user with roles
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id, deleted: false },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: {
                include: {
                  permission: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Get all roles with permissions
router.get('/roles', async (req, res) => {
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

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where: {
        ...searchConditions,
        deleted: false, // Exclude deleted records
      },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        users: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      skip: offset,
      take: limit,
    }),
    prisma.role.count({ where: { ...searchConditions, deleted: false } }),
  ]);

  res.json({
    data: roles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get all permissions
router.get('/permissions', async (_req, res) => {
  const permissions = await prisma.permission.findMany({
    where: { deleted: false }, // Exclude deleted records
    orderBy: [
      { resource: 'asc' },
      { action: 'asc' },
    ],
    select: { id: true, name: true, resource: true, action: true, description: true, system: true },
  });
  res.json(permissions);
});

// Permission config (resources and actions) - for frontend to drive UI
router.get('/permission-config', async (_req, res) => {
  // Build resource-specific actions map for frontend
  const resourceActions: Record<string, string[]> = {};
  for (const resource of PERMISSION_RESOURCES) {
    resourceActions[resource] = getActionsForResource(resource);
  }

  res.json({ 
    resources: Array.from(PERMISSION_RESOURCES), 
    actions: PERMISSION_ACTIONS, // All possible actions (backwards compatibility)
    resourceActions, // Map of resource -> [actions] for resource-specific filtering
  });
});

// Assign role to user
router.post('/users/:userId/roles/:roleId', requirePermission('roles:manage'), async (req, res) => {
  const { userId, roleId } = req.params;
  try {
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    res.status(201).json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User already has this role' });
    }
    return res.status(400).json({ error: 'Failed to assign role' });
  }
});

// Remove role from user
router.delete('/users/:userId/roles/:roleId', requirePermission('roles:manage'), async (req, res) => {
  const { userId, roleId } = req.params;
  try {
    // Prevent removing admin role if it would leave no approved admins
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin', deleted: false } });
    if (adminRole && adminRole.id === roleId) {
      const remaining = await prisma.userRole.count({
        where: {
          roleId: adminRole.id,
          user: {
            status: 'approved',
            id: { not: userId },
            deleted: false,
          } as any,
        },
      });
      if (remaining <= 0) {
        return res.status(400).json({ error: 'At least one approved admin must remain' });
      }
    }
    // Prevent removing the default regular role from any user
    const regularRole = await prisma.role.findUnique({ where: { name: 'regular', deleted: false } });
    if (regularRole && regularRole.id === roleId) {
      return res.status(400).json({ error: 'Default role cannot be removed from user' });
    }
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
    res.status(204).end();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to remove role' });
  }
});

// Create a new role
router.post('/roles', requirePermission('roles:create'), async (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });
  if (name === 'admin' || name === 'regular') return res.status(400).json({ error: 'Default roles cannot be created or modified' });
  try {
    const role = await prisma.role.create({
      data: { name },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.role,
      resourceId: role.id,
      action: AuditAction.create,
      userId: req.user?.id,
      changes: { created: role },
      ...requestMetadata,
    });
    
    res.status(201).json(role);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Role already exists' });
    }
    return res.status(400).json({ error: 'Failed to create role' });
  }
});

// Assign permission to role
router.post('/roles/:roleId/permissions/:permissionId', requirePermission('roles:manage'), async (req, res) => {
  const { roleId, permissionId } = req.params;
  try {
    let role = await prisma.role.findUnique({ where: { id: roleId, deleted: false } });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.name === 'admin' || role.name === 'regular') return res.status(400).json({ error: 'Default role permissions cannot be modified' });
    await prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
    role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    res.status(201).json(role);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Role already has this permission' });
    }
    return res.status(400).json({ error: 'Failed to assign permission' });
  }
});

// Remove permission from role
router.delete('/roles/:roleId/permissions/:permissionId', requirePermission('roles:manage'), async (req, res) => {
  const { roleId, permissionId } = req.params;
  try {
    const role = await prisma.role.findUnique({ where: { id: roleId, deleted: false } });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.name === 'admin' || role.name === 'regular') return res.status(400).json({ error: 'Default role permissions cannot be modified' });
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
    res.status(204).end();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to remove permission' });
  }
});

// Create a new user
router.post('/users', requirePermission('users:create'), async (req: AuthRequest, res) => {
  const { email, password, name, username, tagIds } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({ where: { email, deleted: false } });
  if (existingEmail) return res.status(409).json({ error: 'Email already registered' });
  
  // Check if username already exists (if provided)
  if (username) {
    const existingUsername = await prisma.user.findUnique({ where: { username, deleted: false } });
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' });
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  const finalUsername = username?.trim() || email;
  
  try {
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: name || null,
          username: finalUsername,
          status: 'approved', // Admin-created users are automatically approved
        },
      });

      // Assign default role "regular" to newly created user
      const regularRole = await tx.role.findUnique({ where: { name: 'regular', deleted: false } });
      if (regularRole) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: createdUser.id, roleId: regularRole.id } },
          update: {},
          create: { userId: createdUser.id, roleId: regularRole.id },
        });
      }

      // Attach tags if provided
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        const tagData = tagIds.map((tagId: number) => ({
          userId: createdUser.id,
          tagId: Number(tagId),
        }));
        await tx.userTag.createMany({ data: tagData, skipDuplicates: true });
      }

      // Return user with roles and tags
      return await tx.user.findUnique({
        where: { id: createdUser.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  value: true,
                  color: true,
                },
              },
            },
          },
        },
      });
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.user,
      resourceId: user.id,
      action: AuditAction.create,
      userId: req.user?.id,
      changes: { created: user },
      ...requestMetadata,
    });
    
    res.status(201).json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User already exists' });
    }
    return res.status(400).json({ error: 'Failed to create user' });
  }
});

// Update a user
router.put('/users/:id', requirePermission('users:update'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { email, name, username, password, tagIds } = req.body;
  
  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { id, deleted: false } });
  if (!existingUser) return res.status(404).json({ error: 'User not found' });
  
  const oldUser = { ...existingUser };
  
  // Check if email is being changed and if it's already taken
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({ where: { email, deleted: false } });
    if (emailExists) return res.status(409).json({ error: 'Email already in use' });
  }
  
  // Check if username is being changed and if it's already taken
  if (username !== undefined) {
    const trimmedUsername = username.trim() || email || existingUser.email;
    if (trimmedUsername !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({ where: { username: trimmedUsername, deleted: false } });
      if (usernameExists) return res.status(409).json({ error: 'Username already taken' });
    }
  }
  
  const updateData: any = {};
  if (email !== undefined) updateData.email = email;
  if (name !== undefined) updateData.name = name || null;
  if (username !== undefined) updateData.username = username.trim() || email || existingUser.email;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
  
  try {
    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
      });

      // Update tags if provided
      if (tagIds !== undefined) {
        // Remove all existing tags
        await tx.userTag.deleteMany({ where: { userId: id } });
        
        // Add new tags if provided
        if (Array.isArray(tagIds) && tagIds.length > 0) {
          const tagData = tagIds.map((tagId: number) => ({
            userId: id,
            tagId: Number(tagId),
          }));
          await tx.userTag.createMany({ data: tagData, skipDuplicates: true });
        }
      }

      // Return user with roles and tags
      return await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  value: true,
                  color: true,
                },
              },
            },
          },
        },
      });
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    const changes = getChanges(oldUser, user);
    if (changes) {
      await logAudit({
        resourceType: AuditResourceType.user,
        resourceId: id,
        action: AuditAction.update,
        userId: req.user?.id,
        changes,
        ...requestMetadata,
      });
    }
    
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Duplicate entry' });
    }
    return res.status(400).json({ error: 'Failed to update user' });
  }
});

// Delete a user
router.delete('/users/:id', requirePermission('users:delete'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id, deleted: false } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  try {
    // Prevent deleting last approved admin
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin', deleted: false } });
    if (adminRole) {
      const isAdmin = await prisma.userRole.findUnique({ where: { userId_roleId: { userId: id, roleId: adminRole.id } } });
      if (isAdmin) {
        const remaining = await prisma.userRole.count({
          where: {
            roleId: adminRole.id,
            user: {
              status: 'approved',
              id: { not: id },
              deleted: false,
            } as any,
          },
        });
        if (remaining <= 0) {
          return res.status(400).json({ error: 'At least one approved admin must remain' });
        }
      }
    }
    
    // Soft delete user
    await prisma.user.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: req.user?.id || null,
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.user,
      resourceId: id,
      action: AuditAction.delete,
      userId: req.user?.id,
      changes: { deleted: user },
      ...requestMetadata,
    });
    
    res.status(204).end();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to delete user' });
  }
});

// Update a role
router.put('/roles/:id', requirePermission('roles:update'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });
  
  // Check if role exists
  const existingRole = await prisma.role.findUnique({ where: { id, deleted: false } });
  if (!existingRole) return res.status(404).json({ error: 'Role not found' });
  if (existingRole.name === 'admin' || existingRole.name === 'regular') return res.status(400).json({ error: 'Default roles cannot be modified' });
  
  const oldRole = { ...existingRole };
  
  // Check if name is being changed and if it's already taken
  if (name !== existingRole.name) {
    const nameExists = await prisma.role.findUnique({ where: { name, deleted: false } });
    if (nameExists) return res.status(409).json({ error: 'Role name already exists' });
  }
  
  try {
    const role = await prisma.role.update({
      where: { id },
      data: { name },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        users: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    const changes = getChanges(oldRole, role);
    if (changes) {
      await logAudit({
        resourceType: AuditResourceType.role,
        resourceId: id,
        action: AuditAction.update,
        userId: req.user?.id,
        changes,
        ...requestMetadata,
      });
    }
    
    res.json(role);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    return res.status(400).json({ error: 'Failed to update role' });
  }
});

// Delete a role
router.delete('/roles/:id', requirePermission('roles:delete'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const existingRole = await prisma.role.findUnique({ where: { id, deleted: false } });
  if (!existingRole) return res.status(404).json({ error: 'Role not found' });
  if (existingRole.name === 'admin' || existingRole.name === 'regular') return res.status(400).json({ error: 'Default roles cannot be deleted' });
  
  try {
    // Soft delete role
    await prisma.role.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.role,
      resourceId: id,
      action: AuditAction.delete,
      userId: req.user?.id,
      changes: { deleted: existingRole },
      ...requestMetadata,
    });
    
    res.status(204).end();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to delete role' });
  }
});

// Create a new permission
router.post('/permissions', requirePermission('permissions:create'), async (req: AuthRequest, res) => {
  const { name, resource, action, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Permission name is required' });
  if (!resource) return res.status(400).json({ error: 'Resource is required' });
  if (!action) return res.status(400).json({ error: 'Action is required' });
  // Prevent creating permissions that collide with system-managed standard perms with different name
  if (name !== `${resource}:${action}`) {
    const existingSystem = await prisma.permission.findUnique({ where: { resource_action: { resource, action }, deleted: false } });
    if (existingSystem) return res.status(409).json({ error: 'A system permission for this resource and action already exists' });
  }
  try {
    const permission = await prisma.permission.create({
      data: { name, resource, action, description: description || null },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.permission,
      resourceId: permission.id,
      action: AuditAction.create,
      userId: req.user?.id,
      changes: { created: permission },
      ...requestMetadata,
    });
    
    res.status(201).json(permission);
  } catch (error: any) {
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('name')) {
        return res.status(409).json({ error: 'Permission name already exists' });
      }
      if (error.meta?.target?.includes('resource') && error.meta?.target?.includes('action')) {
        return res.status(409).json({ error: 'Permission with this resource and action already exists' });
      }
    }
    return res.status(400).json({ error: 'Failed to create permission' });
  }
});

// Update a permission
router.put('/permissions/:id', requirePermission('permissions:update'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, resource, action, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Permission name is required' });
  if (!resource) return res.status(400).json({ error: 'Resource is required' });
  if (!action) return res.status(400).json({ error: 'Action is required' });
  
  // Check if permission exists
  const existingPermission = await prisma.permission.findUnique({ where: { id, deleted: false } });
  if (!existingPermission) return res.status(404).json({ error: 'Permission not found' });
  // Block updates to system permissions (standard resource:action set)
  const isSystem = isSystemPermission(existingPermission.resource, existingPermission.action);
  if (isSystem) return res.status(400).json({ error: 'System permissions cannot be modified' });
  
  const oldPermission = { ...existingPermission };
  
  // Check if name is being changed and if it's already taken
  if (name !== existingPermission.name) {
    const nameExists = await prisma.permission.findUnique({ where: { name, deleted: false } });
    if (nameExists) return res.status(409).json({ error: 'Permission name already exists' });
  }
  
  // Check if resource:action combination is being changed and if it's already taken
  if (resource !== existingPermission.resource || action !== existingPermission.action) {
    const comboExists = await prisma.permission.findFirst({ 
      where: { 
        resource,
        action,
        id: { not: id },
        deleted: false,
      },
    });
    if (comboExists) {
      return res.status(409).json({ error: 'Permission with this resource and action already exists' });
    }
  }
  
  try {
    const permission = await prisma.permission.update({
      where: { id },
      data: { name, resource, action, description: description || null },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    const changes = getChanges(oldPermission, permission);
    if (changes) {
      await logAudit({
        resourceType: AuditResourceType.permission,
        resourceId: id,
        action: AuditAction.update,
        userId: req.user?.id,
        changes,
        ...requestMetadata,
      });
    }
    
    res.json(permission);
  } catch (error: any) {
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('name')) {
        return res.status(409).json({ error: 'Permission name already exists' });
      }
      if (error.meta?.target?.includes('resource') && error.meta?.target?.includes('action')) {
        return res.status(409).json({ error: 'Permission with this resource and action already exists' });
      }
    }
    return res.status(400).json({ error: 'Failed to update permission' });
  }
});

// Delete a permission
router.delete('/permissions/:id', requirePermission('permissions:delete'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const perm = await prisma.permission.findUnique({ where: { id, deleted: false } });
  if (!perm) return res.status(404).json({ error: 'Permission not found' });
  const isSystem = isSystemPermission(perm.resource, perm.action);
  if (isSystem) return res.status(400).json({ error: 'System permissions cannot be deleted' });
  
  try {
    // Soft delete permission
    await prisma.permission.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.permission,
      resourceId: id,
      action: AuditAction.delete,
      userId: req.user?.id,
      changes: { deleted: perm },
      ...requestMetadata,
    });
    
    res.status(204).end();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to delete permission' });
  }
});

// Approve a user
router.post('/users/:id/approve', requirePermission('users:update'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const existingUser = await prisma.user.findUnique({ where: { id, deleted: false } });
  if (!existingUser) return res.status(404).json({ error: 'User not found' });
  
  try {
    const user = await prisma.user.update({
      where: { id, deleted: false },
      data: { status: 'approved' },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.user,
      resourceId: id,
      action: AuditAction.update,
      userId: req.user?.id,
      changes: { status: { before: existingUser.status, after: 'approved' } },
      ...requestMetadata,
    });
    
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: 'Failed to approve user' });
  }
});

// Block a user
router.post('/users/:id/block', requirePermission('users:update'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const existingUser = await prisma.user.findUnique({ where: { id, deleted: false } });
  if (!existingUser) return res.status(404).json({ error: 'User not found' });
  
  try {
    // Prevent blocking the last approved admin
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin', deleted: false } });
    if (adminRole) {
      const isAdmin = await prisma.userRole.findUnique({ where: { userId_roleId: { userId: id, roleId: adminRole.id } } });
      if (isAdmin) {
        const remaining = await prisma.userRole.count({
          where: {
            roleId: adminRole.id,
            user: {
              status: 'approved',
              id: { not: id },
              deleted: false,
            } as any,
          },
        });
        if (remaining <= 0) {
          return res.status(400).json({ error: 'At least one approved admin must remain' });
        }
      }
    }
    const user = await prisma.user.update({
      where: { id, deleted: false },
      data: { status: 'blocked' },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.user,
      resourceId: id,
      action: AuditAction.update,
      userId: req.user?.id,
      changes: { status: { before: existingUser.status, after: 'blocked' } },
      ...requestMetadata,
    });
    
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: 'Failed to block user' });
  }
});

// Unblock a user (approve)
router.post('/users/:id/unblock', requirePermission('users:update'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const existingUser = await prisma.user.findUnique({ where: { id, deleted: false } });
  if (!existingUser) return res.status(404).json({ error: 'User not found' });
  
  try {
    const user = await prisma.user.update({
      where: { id, deleted: false },
      data: { status: 'approved' },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    await logAudit({
      resourceType: AuditResourceType.user,
      resourceId: id,
      action: AuditAction.update,
      userId: req.user?.id,
      changes: { status: { before: existingUser.status, after: 'approved' } },
      ...requestMetadata,
    });
    
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: 'Failed to unblock user' });
  }
});

// Reject a user (set status to rejected instead of deleting)
router.delete('/users/:id/reject', requirePermission('users:delete'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id, deleted: false } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const oldUser = { ...user };
  
  try {
    // Set status to rejected (user can be reactivated later)
    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: 'rejected',
        updatedBy: req.user?.id || null,
      },
    });
    
    // Log audit
    const requestMetadata = getRequestMetadata(req);
    const changes = getChanges(oldUser, updated);
    await logAudit({
      resourceType: AuditResourceType.user,
      resourceId: id,
      action: AuditAction.update,
      userId: req.user?.id,
      changes: changes || { status: { before: oldUser.status, after: 'rejected' } },
      metadata: { reason: 'reject' },
      ...requestMetadata,
    });
    
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: 'Failed to reject user' });
  }
});

export default router;