import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Roles
  const [adminRole, viewerRole] = await Promise.all([
    prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } }),
    prisma.role.upsert({ where: { name: 'viewer' }, update: {}, create: { name: 'viewer' } }),
  ]);

  // Permissions
  const [viewCred, editServer] = await Promise.all([
    prisma.permission.upsert({ where: { name: 'view_cred' }, update: {}, create: { name: 'view_cred' } }),
    prisma.permission.upsert({ where: { name: 'edit_server' }, update: {}, create: { name: 'edit_server' } }),
  ]);

  // Map admin to all permissions
  await Promise.all([
    prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: viewCred.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: viewCred.id },
    }),
    prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: editServer.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: editServer.id },
    }),
  ]);

  // Admin user
  const adminEmail = 'admin@example.com';
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: 'Admin', username: 'admin' },
    create: { email: adminEmail, passwordHash, name: 'Admin', username: 'admin' },
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });
}

main().finally(async () => prisma.$disconnect());
