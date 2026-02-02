import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initializeSocket(userId: string): Socket {
  // Return existing socket if already connected
  if (socket?.connected) {
    console.log('[SOCKET] Already connected:', socket.id);
    return socket;
  }

  // Disconnect old socket if exists but not connected
  if (socket) {
    socket.disconnect();
  }

  const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;

  console.log('[SOCKET] Initializing connection to:', socketUrl, 'for user:', userId);

  socket = io(socketUrl, {
    auth: { userId },
    transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason);

    // Auto-reconnect if disconnect wasn't manual
    if (reason === 'io server disconnect') {
      // Server disconnected us, try to reconnect
      socket?.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[SOCKET] Connection error:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[SOCKET] Reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_failed', () => {
    console.error('[SOCKET] Reconnection failed after max attempts');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log('[SOCKET] Disconnecting...');
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function isSocketConnected(): boolean {
  return socket?.connected || false;
}

export function emitToServer(event: string, data: any) {
  if (socket?.connected) {
    socket.emit(event, data);
    console.log('[SOCKET] Emitted event:', event, data);
  } else {
    console.warn('[SOCKET] Not connected, cannot emit event:', event);
  }
}

export function subscribeToEvent(event: string, callback: (data: any) => void) {
  if (socket) {
    socket.on(event, callback);
    console.log('[SOCKET] Subscribed to event:', event);

    // Return unsubscribe function
    return () => {
      socket?.off(event, callback);
      console.log('[SOCKET] Unsubscribed from event:', event);
    };
  }

  console.warn('[SOCKET] Socket not initialized, cannot subscribe to:', event);
  return () => {};
}

export function joinGroupRoom(groupId: string) {
  emitToServer('join-group', groupId);
}

export function leaveGroupRoom(groupId: string) {
  emitToServer('leave-group', groupId);
}
