import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface SocketData {
  userId: string;
  orgId: string;
  role: string;
}

let io: SocketIOServer;

/**
 * Initialize Socket.IO server with authentication
 */
export function initializeSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: Socket & { data: SocketData }, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as any;
      
      socket.data.userId = decoded.sub;
      socket.data.orgId = decoded.org_id;
      socket.data.role = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket & { data: SocketData }) => {
    console.log(`User connected: ${socket.data.userId} (Org: ${socket.data.orgId})`);

    // Join organization-specific room
    socket.join(`org:${socket.data.orgId}`);

    // Join user-specific room for direct messages
    socket.join(`user:${socket.data.userId}`);

    /**
     * Real-time notifications
     */
    socket.on('notification:send', (data: { userId: string; message: string; type: string }) => {
      io.to(`user:${data.userId}`).emit('notification:receive', {
        from: socket.data.userId,
        message: data.message,
        type: data.type,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Real-time deal updates (for sales pipeline)
     */
    socket.on('deal:update', (data: { dealId: string; changes: any }) => {
      // Broadcast to all users in the same organization
      socket.to(`org:${socket.data.orgId}`).emit('deal:updated', {
        dealId: data.dealId,
        changes: data.changes,
        updatedBy: socket.data.userId,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Real-time contact updates
     */
    socket.on('contact:update', (data: { contactId: string; changes: any }) => {
      socket.to(`org:${socket.data.orgId}`).emit('contact:updated', {
        contactId: data.contactId,
        changes: data.changes,
        updatedBy: socket.data.userId,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Real-time workflow execution status
     */
    socket.on('workflow:status', (data: { workflowId: string; status: string; progress: number }) => {
      socket.to(`org:${socket.data.orgId}`).emit('workflow:progress', {
        workflowId: data.workflowId,
        status: data.status,
        progress: data.progress,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Real-time email campaign metrics
     */
    socket.on('campaign:metrics', (data: { campaignId: string; metrics: any }) => {
      socket.to(`org:${socket.data.orgId}`).emit('campaign:live_metrics', {
        campaignId: data.campaignId,
        metrics: data.metrics,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Real-time social media engagement
     */
    socket.on('social:engagement', (data: { postId: string; engagement: any }) => {
      socket.to(`org:${socket.data.orgId}`).emit('social:live_engagement', {
        postId: data.postId,
        engagement: data.engagement,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Typing indicators for internal comments
     */
    socket.on('typing:start', (data: { roomId: string; resourceId: string }) => {
      socket.to(`org:${socket.data.orgId}`).emit('typing:indicator', {
        userId: socket.data.userId,
        roomId: data.roomId,
        resourceId: data.resourceId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data: { roomId: string; resourceId: string }) => {
      socket.to(`org:${socket.data.orgId}`).emit('typing:indicator', {
        userId: socket.data.userId,
        roomId: data.roomId,
        resourceId: data.resourceId,
        isTyping: false,
      });
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.userId}`);
      socket.leave(`org:${socket.data.orgId}`);
      socket.leave(`user:${socket.data.userId}`);
    });

    /**
     * Handle errors
     */
    socket.on('error', (error: Error) => {
      console.error(`Socket error for user ${socket.data.userId}:`, error);
    });
  });

  return io;
}

/**
 * Get Socket.IO instance
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
}

/**
 * Emit event to organization room
 */
export function emitToOrg(orgId: string, event: string, data: any) {
  if (io) {
    io.to(`org:${orgId}`).emit(event, data);
  }
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// Export server singleton for use in server.ts
export const server = {
  attach: (httpServer: HTTPServer) => initializeSocket(httpServer),
};
