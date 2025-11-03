import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSION_RESOURCES, getActionsForResource } from '../src/constants/permissions';

const prisma = new PrismaClient();

async function main() {
  // Default roles (system)
  const adminRole = await prisma.role.upsert({ where: { name: 'admin' }, update: { system: true }, create: { name: 'admin', system: true } });
  const regularRole = await prisma.role.upsert({ where: { name: 'regular' }, update: { system: true }, create: { name: 'regular', system: true } });

  // Seed standard permissions as system and grant all to admin
  // Use resource-specific actions for each resource
  for (const resource of PERMISSION_RESOURCES) {
    const actions = getActionsForResource(resource);
    for (const action of actions) {
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
  const profileUpdate = await prisma.permission.findUnique({ where: { resource_action: { resource: 'profile', action: 'manage' } } });
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
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if(!admin) {
    admin = await prisma.user.create({data: { email: adminEmail, passwordHash, name: 'Admin', username: 'admin', status: 'approved' }});
  }
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: regularRole.id } },
    update: {},
    create: { userId: admin.id, roleId: regularRole.id },
  });
}

main().finally(async () => prisma.$disconnect());
