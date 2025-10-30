import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

// Get all users with their roles
router.get('/users', async (req, res) => {
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
      where: searchConditions,
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
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    }),
    prisma.user.count({ where: searchConditions }),
  ]);

  res.json({
    data: users,
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
    where: { id },
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
      where: searchConditions,
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
    prisma.role.count({ where: searchConditions }),
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
    orderBy: [
      { resource: 'asc' },
      { action: 'asc' },
    ],
    select: { id: true, name: true, resource: true, action: true, description: true },
  });
  res.json(permissions);
});

// Assign role to user
router.post('/users/:userId/roles/:roleId', async (req, res) => {
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
router.delete('/users/:userId/roles/:roleId', async (req, res) => {
  const { userId, roleId } = req.params;
  try {
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
router.post('/roles', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });
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
    res.status(201).json(role);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Role already exists' });
    }
    return res.status(400).json({ error: 'Failed to create role' });
  }
});

// Assign permission to role
router.post('/roles/:roleId/permissions/:permissionId', async (req, res) => {
  const { roleId, permissionId } = req.params;
  try {
    await prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
    const role = await prisma.role.findUnique({
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
router.delete('/roles/:roleId/permissions/:permissionId', async (req, res) => {
  const { roleId, permissionId } = req.params;
  try {
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
router.post('/users', async (req, res) => {
  const { email, password, name, username } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return res.status(409).json({ error: 'Email already registered' });
  
  // Check if username already exists (if provided)
  if (username) {
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' });
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  const finalUsername = username?.trim() || email;
  
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        username: finalUsername,
        status: 'approved', // Admin-created users are automatically approved
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
      },
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
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, name, username, password } = req.body;
  
  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) return res.status(404).json({ error: 'User not found' });
  
  // Check if email is being changed and if it's already taken
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) return res.status(409).json({ error: 'Email already in use' });
  }
  
  // Check if username is being changed and if it's already taken
  if (username !== undefined) {
    const trimmedUsername = username.trim() || email || existingUser.email;
    if (trimmedUsername !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({ where: { username: trimmedUsername } });
      if (usernameExists) return res.status(409).json({ error: 'Username already taken' });
    }
  }
  
  const updateData: any = {};
  if (email !== undefined) updateData.email = email;
  if (name !== undefined) updateData.name = name || null;
  if (username !== undefined) updateData.username = username.trim() || email || existingUser.email;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
  
  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Duplicate entry' });
    }
    return res.status(400).json({ error: 'Failed to update user' });
  }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete user roles first (cascade)
    await prisma.userRole.deleteMany({ where: { userId: id } });
    // Delete user
    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to delete user' });
  }
});

// Update a role
router.put('/roles/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });
  
  // Check if role exists
  const existingRole = await prisma.role.findUnique({ where: { id } });
  if (!existingRole) return res.status(404).json({ error: 'Role not found' });
  
  // Check if name is being changed and if it's already taken
  if (name !== existingRole.name) {
    const nameExists = await prisma.role.findUnique({ where: { name } });
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
    res.json(role);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    return res.status(400).json({ error: 'Failed to update role' });
  }
});

// Delete a role
router.delete('/roles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete role permissions first (cascade)
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    // Delete user roles first (cascade)
    await prisma.userRole.deleteMany({ where: { roleId: id } });
    // Delete role
    await prisma.role.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to delete role' });
  }
});

// Create a new permission
router.post('/permissions', async (req, res) => {
  const { name, resource, action, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Permission name is required' });
  if (!resource) return res.status(400).json({ error: 'Resource is required' });
  if (!action) return res.status(400).json({ error: 'Action is required' });
  try {
    const permission = await prisma.permission.create({
      data: { name, resource, action, description: description || null },
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
router.put('/permissions/:id', async (req, res) => {
  const { id } = req.params;
  const { name, resource, action, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Permission name is required' });
  if (!resource) return res.status(400).json({ error: 'Resource is required' });
  if (!action) return res.status(400).json({ error: 'Action is required' });
  
  // Check if permission exists
  const existingPermission = await prisma.permission.findUnique({ where: { id } });
  if (!existingPermission) return res.status(404).json({ error: 'Permission not found' });
  
  // Check if name is being changed and if it's already taken
  if (name !== existingPermission.name) {
    const nameExists = await prisma.permission.findUnique({ where: { name } });
    if (nameExists) return res.status(409).json({ error: 'Permission name already exists' });
  }
  
  // Check if resource:action combination is being changed and if it's already taken
  if (resource !== existingPermission.resource || action !== existingPermission.action) {
    const comboExists = await prisma.permission.findFirst({ 
      where: { 
        resource,
        action,
        id: { not: id },
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
router.delete('/permissions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete role permissions first (cascade)
    await prisma.rolePermission.deleteMany({ where: { permissionId: id } });
    // Delete permission
    await prisma.permission.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to delete permission' });
  }
});

// Approve a user
router.post('/users/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id },
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
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: 'Failed to approve user' });
  }
});

// Block a user
router.post('/users/:id/block', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id },
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
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: 'Failed to block user' });
  }
});

// Unblock a user (approve)
router.post('/users/:id/unblock', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id },
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
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: 'Failed to unblock user' });
  }
});

// Reject a user (delete)
router.delete('/users/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete user roles first (cascade)
    await prisma.userRole.deleteMany({ where: { userId: id } });
    // Delete user
    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: 'Failed to reject user' });
  }
});

export default router;