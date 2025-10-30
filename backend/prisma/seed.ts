import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Default roles (system)
  const adminRole = await prisma.role.upsert({ where: { name: 'admin' }, update: { system: true }, create: { name: 'admin', system: true } });
  const regularRole = await prisma.role.upsert({ where: { name: 'regular' }, update: { system: true }, create: { name: 'regular', system: true } });

  // Seed standard permissions as system and grant all to admin
  const RESOURCES = ['users','roles','permissions','credentials','servers','services','groups','tags','release-notes','dashboard','profile'];
  const ACTIONS = ['view','create','update','delete','manage'];
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const name = `${resource}:${action}`;
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: { system: true },
        create: { name, resource, action, description: `${action} ${resource}`, system: true },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
  }

  // Ensure regular has only profile:update
  const profileUpdate = await prisma.permission.findUnique({ where: { resource_action: { resource: 'profile', action: 'update' } } });
  if (profileUpdate) {
    await prisma.rolePermission.deleteMany({ where: { roleId: regularRole.id } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: regularRole.id, permissionId: profileUpdate.id } },
      update: {},
      create: { roleId: regularRole.id, permissionId: profileUpdate.id },
    });
  }

  // Admin user (approved)
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: 'Admin', username: 'admin', status: 'approved' },
    create: { email: adminEmail, passwordHash, name: 'Admin', username: 'admin', status: 'approved' },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });
}

main().finally(async () => prisma.$disconnect());
