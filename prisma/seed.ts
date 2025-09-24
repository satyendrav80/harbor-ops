import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count === 0) {
    await prisma.user.create({ data: { email: 'admin@example.com', name: 'Admin' } });
  }
}

main().finally(async () => prisma.$disconnect());
