import { PrismaClient } from '@prisma/client';
import { getIO } from '../../../socket/socket';

const prisma = new PrismaClient();

export async function createNotification(data: {
  userId: string;
  type: string;
  taskId?: number;
  commentId?: number;
  releaseNoteId?: number;
  title: string;
  message: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      taskId: data.taskId,
      commentId: data.commentId,
      releaseNoteId: data.releaseNoteId,
      title: data.title,
      message: data.message,
    },
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
      releaseNote: {
        select: {
          id: true,
        },
      },
    },
  });

  // Emit Socket.IO event to the user
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${data.userId}`).emit('notification:new', notification);
  } catch (error) {
    // Socket.IO might not be initialized, ignore
  }

  return notification;
}
