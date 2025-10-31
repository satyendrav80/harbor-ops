import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import { PrismaClient } from '@prisma/client';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from './constants/permissions';
import serversRouter from './routes/servers';
import servicesRouter from './routes/services';
import credentialsRouter from './routes/credentials';
import groupsRouter from './routes/groups';
import tagsRouter from './routes/tags';
import releaseNotesRouter from './routes/releaseNotes';
import usersRouter from './routes/users';
import { requireApprovedUser } from './middleware/auth';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/auth', authRouter);
// Protect all app routes (except /auth) with approval middleware
app.use('/servers', requireApprovedUser, serversRouter);
app.use('/services', requireApprovedUser, servicesRouter);
app.use('/credentials', requireApprovedUser, credentialsRouter);
app.use('/groups', requireApprovedUser, groupsRouter);
app.use('/tags', requireApprovedUser, tagsRouter);
app.use('/release-notes', requireApprovedUser, releaseNotesRouter);
app.use('/', requireApprovedUser, usersRouter);

const port = Number(process.env.PORT) || 3044;

// Initialize default roles/permissions on boot
async function initializeDefaults() {
  const prisma = new PrismaClient();
  // Ensure default roles exist
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { system: true },
    create: { name: 'admin', system: true },
  });
  const regularRole = await prisma.role.upsert({
    where: { name: 'regular' },
    update: { system: true },
    create: { name: 'regular', system: true },
  });

  // Ensure all standard permissions exist
  for (const resource of PERMISSION_RESOURCES) {
    for (const action of PERMISSION_ACTIONS) {
      const name = `${resource}:${action}`;
      await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: { system: true },
        create: { name, resource, action, description: `${action} ${resource}`, system: true },
      });
    }
  }

  // Assign all permissions to admin role
  const allPerms = await prisma.permission.findMany({ select: { id: true } });
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Assign minimal permission(s) to regular role (profile:update) and remove others if any
  const profileUpdate = await prisma.permission.findUnique({ where: { resource_action: { resource: 'profile', action: 'manage' } } });
  if (profileUpdate) {
    // Clear existing role permissions for regular
    await prisma.rolePermission.deleteMany({ where: { roleId: regularRole.id } });
    await prisma.rolePermission.create({
      data: { roleId: regularRole.id, permissionId: profileUpdate.id },
    });
  }
}

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  initializeDefaults().catch((err) => console.error('Initialization error:', err));
});
