import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer | null = null;

// Track which users are in which task rooms
const taskRoomUsers = new Map<number, Set<string>>();
const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

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
    const socketId = socket.id;

    // Track user sockets
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socketId);

    // Join user-specific room for notifications
    socket.join(`user:${userId}`);

    // Handle explicit user room join (for reconnection scenarios)
    socket.on('join-user-room', (userIdToJoin: string) => {
      if (userIdToJoin === userId) {
        socket.join(`user:${userId}`);
      }
    });

    // Join task-specific rooms for real-time updates
    socket.on('join-task', (taskId: number) => {
      socket.join(`task:${taskId}`);
      
      // Track user in task room
      if (!taskRoomUsers.has(taskId)) {
        taskRoomUsers.set(taskId, new Set());
      }
      taskRoomUsers.get(taskId)!.add(userId);
    });

    socket.on('leave-task', (taskId: number) => {
      socket.leave(`task:${taskId}`);
      
      // Remove user from task room tracking
      const users = taskRoomUsers.get(taskId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) {
          taskRoomUsers.delete(taskId);
        }
      }
    });

    socket.on('disconnect', () => {
      // Remove socket from user tracking
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socketId);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          
          // Remove user from all task rooms
          taskRoomUsers.forEach((users, taskId) => {
            users.delete(userId);
            if (users.size === 0) {
              taskRoomUsers.delete(taskId);
            }
          });
        }
      }
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

export function getUsersInTaskRoom(taskId: number): string[] {
  const users = taskRoomUsers.get(taskId);
  return users ? Array.from(users) : [];
}

export function emitSubtaskCreated(parentTaskId: number, subtask: any) {
  const ioInstance = getIO();
  ioInstance.to(`task:${parentTaskId}`).emit('subtask:created', { parentTaskId, subtask });
}

export function emitTaskUpdated(taskId: number, task: any) {
  const ioInstance = getIO();
  ioInstance.to(`task:${taskId}`).emit('task:updated', task);
}
