import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listNotifications(userId: string, options?: {
  read?: boolean;
  limit?: number;
  offset?: number;
}) {
  const where: any = {
    userId,
  };

  if (options?.read !== undefined) {
    where.read = options.read;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        comment: {
          select: {
            id: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    total,
  };
}
