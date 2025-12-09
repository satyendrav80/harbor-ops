import { io, Socket } from 'socket.io-client';
import { env } from '../constants/env';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (!socket) {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    const backendUrl = env.app_backend_url || 'http://localhost:3044';
    socket = io(backendUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected');
      // Join user-specific room for notifications
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.sub) {
            socket.emit('join-user-room', payload.sub);
          }
        } catch (e) {
          // Ignore token parsing errors
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinTaskRoom(taskId: number) {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit('join-task', taskId);
  }
}

export function leaveTaskRoom(taskId: number) {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit('leave-task', taskId);
  }
}
