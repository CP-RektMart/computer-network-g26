import { Socket } from 'socket.io';
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { GroupMessage } from '@prisma/client';
import jwt from 'jsonwebtoken';

import { JWT_SECRET, LOG_LEVEL } from '@/env';
import { getUserById } from '@/services/users/controller';
import { isGroupExist, isMemberOfGroup, saveGroupMessage } from '@/services/groups/controller';
// TODO: // import { saveDirectMessage } from '@/services/directs/controller'; // You need to implement this

export interface ChatSocket extends Socket {
  userId?: number;
  username?: string;
  type?: string;
  groupId?: number;
  receiverId?: number;
}

const setupSocket = (server: HttpServer, eventName: string): Server => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware to authenticate the user using JWT
  io.use(async (socket: ChatSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token missing'));

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = decoded.userId ? await getUserById(parseInt(decoded.userId)) : null;
      if (!user) return next(new Error('User not found'));

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  // Listen for incoming connections
  io.on('connection', async (socket: ChatSocket) => {
    const { type, groupId, receiverId } = socket.handshake.auth;

    if (!socket.userId || !socket.username) {
      return emitDisconnectReason(socket, 'Missing user info');
    }

    // Group
    if (type === 'group') {
      if (!groupId) return emitDisconnectReason(socket, 'Group ID missing');

      const exist = await isGroupExist(parseInt(groupId));
      if (!exist) return emitDisconnectReason(socket, 'Group not found');

      const isMember = await isMemberOfGroup(socket.userId, parseInt(groupId));
      if (!isMember) return emitDisconnectReason(socket, 'Permission denied');

      socket.type = 'group';
      socket.groupId = parseInt(groupId);
      socket.join(groupFormat(socket.groupId));
    }
    // Direct
    else if (type === 'direct') {
      if (!receiverId) return emitDisconnectReason(socket, 'Receiver ID missing');

      socket.type = 'direct';
      socket.receiverId = parseInt(receiverId);
      socket.join(directFormat(socket.userId, socket.receiverId));
    }
    // Invalid type
    else {
      return emitDisconnectReason(socket, 'Invalid chat type');
    }

    emitConnectionInfo(socket);
    logConnection(socket);

    socket.on(eventName, (data) => {
      if (!data?.content) return;

      if (socket.type === 'group' && socket.groupId) {
        const message = {
          id: groupMessageUniqueId(socket.userId!, socket.groupId!),
          groupId: socket.groupId!,
          userId: socket.userId!,
          content: data.content,
          sentAt: new Date(),
          user: {
            id: socket.userId!,
            username: socket.username!,
          },
        };
        saveGroupMessage(message);
        logMessage(socket, data.content, eventName);

        io.to(groupFormat(socket.groupId!)).emit(eventName, message);
      } else if (socket.type === 'direct' && socket.receiverId) {
        const message = {
          id: directMessageUniqueId(socket.userId!, socket.receiverId!),
          senderId: socket.userId!,
          receiverId: socket.receiverId!,
          content: data.content,
          sentAt: new Date(),
        };
        // saveDirectMessage(message); // You must implement this function in your controller
        logMessage(socket, data.content, eventName);
        io.to(directFormat(socket.userId!, socket.receiverId!)).emit(eventName, message);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
};

export const groupFormat = (groupId: number): string => `group-${groupId}`;
export const directFormat = (id1: number, id2: number): string => {
  const [lower, greater] = id1 < id2 ? [id1, id2] : [id2, id1];
  return `direct-${lower}-${greater}`;
};

export const groupMessageUniqueId = (userId: number, groupId: number) => `${userId}-group-${groupId}`;
export const directMessageUniqueId = (userId: number, receiverId: number) => `${userId}-direct-${receiverId}`;

const emitDisconnectReason = (socket: ChatSocket, reason: string) => {
  socket.emit('disconnectReason', reason);
  socket.disconnect(true);
};

const emitConnectionInfo = (socket: ChatSocket) => {
  socket.emit('connected', {
    userId: socket.userId,
    username: socket.username,
    type: socket.type,
    groupId: socket.groupId,
    receiverId: socket.receiverId,
  });
};

const logConnection = (socket: ChatSocket) => {
  if (!LOG_LEVEL) return;
  let details = `User ID: ${socket.userId} - Name: ${socket.username} - Sender ID: ${socket.id}`;
  if (socket.type === 'group') details += ` - Connected to group ${socket.groupId}`;
  if (socket.type === 'direct') details += ` - DM with ${socket.receiverId}`;
  console.log(details);
};

const logMessage = (socket: ChatSocket, content: string, eventName: string) => {
  if (!LOG_LEVEL) return;
  let details = `User ID: ${socket.userId} - Message for "${eventName}": ${content}`;
  if (socket.type === 'group') details += ` - Group ${socket.groupId}`;
  if (socket.type === 'direct') details += ` - DM to ${directFormat(socket.userId!, socket.receiverId!)}`;
  console.log(details);
};

export default setupSocket;
