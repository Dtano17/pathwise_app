import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Storage } from '../storage';

let io: SocketIOServer | null = null;

export async function initializeSocketIO(socketServer: SocketIOServer, storage: Storage) {
  io = socketServer;

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      // Get userId from handshake auth (passed from client)
      const userId = socket.handshake.auth.userId;

      if (!userId) {
        return next(new Error('Authentication required'));
      }

      // Verify user exists
      const user = await storage.getUser(userId);

      if (!user) {
        return next(new Error('Invalid user'));
      }

      // Attach user info to socket
      socket.data.userId = userId;

      next();
    } catch (error) {
      console.error('[SOCKET.IO] Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`[SOCKET.IO] User ${userId} connected (socket: ${socket.id})`);

    try {
      // Join user's personal room
      socket.join(`user:${userId}`);

      // Join all user's group rooms
      const groups = await storage.getUserGroups(userId);
      for (const group of groups) {
        socket.join(`group:${group.id}`);
        console.log(`[SOCKET.IO] User ${userId} joined group room: ${group.id}`);
      }

      // Handle group joining (when user joins a new group while connected)
      socket.on('join-group', (groupId: string) => {
        socket.join(`group:${groupId}`);
        console.log(`[SOCKET.IO] User ${userId} joined group room: ${groupId}`);
      });

      // Handle group leaving
      socket.on('leave-group', (groupId: string) => {
        socket.leave(`group:${groupId}`);
        console.log(`[SOCKET.IO] User ${userId} left group room: ${groupId}`);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`[SOCKET.IO] User ${userId} disconnected: ${reason}`);
      });

    } catch (error) {
      console.error('[SOCKET.IO] Connection setup error:', error);
      socket.disconnect(true);
    }
  });

  console.log('[SOCKET.IO] Socket service initialized with authentication');
}

export class SocketService {
  // Emit to specific user
  static emitToUser(userId: string, event: string, data: any) {
    if (!io) {
      console.warn('[SOCKET.IO] Socket.io not initialized, cannot emit event:', event);
      return;
    }
    io.to(`user:${userId}`).emit(event, data);
  }

  // Emit to all group members
  static emitToGroup(groupId: string, event: string, data: any) {
    if (!io) {
      console.warn('[SOCKET.IO] Socket.io not initialized, cannot emit event:', event);
      return;
    }
    io.to(`group:${groupId}`).emit(event, data);
  }

  // Emit to group excluding sender
  static emitToGroupExcept(groupId: string, excludeUserId: string, event: string, data: any) {
    if (!io) {
      console.warn('[SOCKET.IO] Socket.io not initialized, cannot emit event:', event);
      return;
    }

    // Emit to group room but exclude the user's personal room
    io.to(`group:${groupId}`).except(`user:${excludeUserId}`).emit(event, data);
  }

  // Task completion event
  static emitTaskCompleted(groupId: string, taskId: string, userId: string, userName: string, taskTitle: string) {
    this.emitToGroupExcept(groupId, userId, 'task:completed', {
      taskId,
      userId,
      userName,
      taskTitle,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SOCKET.IO] Emitted task:completed to group ${groupId} (excluding user ${userId})`);
  }

  // Member joined event
  static emitMemberJoined(groupId: string, userId: string, userName: string) {
    this.emitToGroup(groupId, 'member:joined', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SOCKET.IO] Emitted member:joined to group ${groupId}`);
  }

  // Member left event
  static emitMemberLeft(groupId: string, userId: string, userName: string) {
    this.emitToGroup(groupId, 'member:left', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SOCKET.IO] Emitted member:left to group ${groupId}`);
  }

  // Activity shared event
  static emitActivityShared(groupId: string, activityId: string, activityTitle: string, sharedBy: string) {
    this.emitToGroup(groupId, 'activity:shared', {
      activityId,
      activityTitle,
      sharedBy,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SOCKET.IO] Emitted activity:shared to group ${groupId}`);
  }

  // Progress update event
  static emitProgressUpdate(groupId: string, progress: { completed: number; total: number; percentage: number }) {
    this.emitToGroup(groupId, 'progress:update', {
      ...progress,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SOCKET.IO] Emitted progress:update to group ${groupId}: ${progress.percentage}%`);
  }

  // Generic group notification event
  static emitGroupNotification(groupId: string, notification: { title: string; body: string; type: string }) {
    this.emitToGroup(groupId, 'notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
    console.log(`[SOCKET.IO] Emitted notification to group ${groupId}: ${notification.title}`);
  }
}

// Export singleton instance
export const socketService = SocketService;
