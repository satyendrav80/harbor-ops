import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer | null = null;

export function initializeSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3045',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const secret = process.env.JWT_SECRET || 'dev_secret';
      const payload = jwt.verify(token, secret) as any;
      socket.data.userId = payload.sub;
      socket.data.userEmail = payload.email;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    // Join task-specific rooms for real-time updates
    socket.on('join-task', (taskId: number) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('leave-task', (taskId: number) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on('disconnect', () => {
      // Socket disconnected
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
}

// Helper functions to emit events
export function emitCommentCreated(taskId: number, comment: any) {
  const ioInstance = getIO();
  ioInstance.to(`task:${taskId}`).emit('comment:created', comment);
}

export function emitCommentUpdated(taskId: number, comment: any) {
  const ioInstance = getIO();
  ioInstance.to(`task:${taskId}`).emit('comment:updated', comment);
}

export function emitCommentDeleted(taskId: number, commentId: number) {
  const ioInstance = getIO();
  ioInstance.to(`task:${taskId}`).emit('comment:deleted', { commentId, taskId });
}

export function emitReactionAdded(taskId: number, commentId: number, reaction: any) {
  const ioInstance = getIO();
  ioInstance.to(`task:${taskId}`).emit('reaction:added', { commentId, taskId, reaction });
}

export function emitReactionRemoved(taskId: number, commentId: number, emoji: string, userId: string) {
  const ioInstance = getIO();
  ioInstance.to(`task:${taskId}`).emit('reaction:removed', { commentId, taskId, emoji, userId });
}
