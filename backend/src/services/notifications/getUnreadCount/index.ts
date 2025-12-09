import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}
