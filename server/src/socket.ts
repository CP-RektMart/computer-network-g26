import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const logLevel: string = process.env.LOG_REQUESTS || '';
const JWT_SECRET = process.env.JWT_SECRET || '';

interface ChatSocket extends Socket {
  name?: string;
  userId?: string;
  type?: string;
  groupId?: string;
  receiverId?: string;
}

interface ChatResponse {
  userId: string;
  name: string;
  type: 'group' | 'direct';
  message: string;
  groupId?: string;
  receiverId?: string;
}

const setupSocket = (server: HttpServer, eventName: string): Server => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket: ChatSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: Token missing'));

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);

      if (decoded && typeof decoded !== 'string' && decoded.userId && decoded.name) {
        socket.userId = decoded.userId;
        socket.name = decoded.name;
        next();
      } else {
        next(new Error('Authentication error: Invalid token payload. Missing userId or name'));
      }
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: ChatSocket) => {
    const { type, groupId, receiverId } = socket.handshake.auth;
    if (!socket.userId || !socket.name || !type) return socket.disconnect();

    socket.type = type;

    if (type === 'group') {
      if (!groupId) return socket.disconnect();
      socket.groupId = groupId;
      socket.join(groupFormat(groupId));
    } else if (type === 'direct') {
      if (!receiverId) return socket.disconnect();
      socket.receiverId = receiverId;
      socket.join(directFormat(socket.userId, receiverId));
    } else {
      return socket.disconnect();
    }

    emitConnectionInfo(socket);
    logConnection(socket);

    socket.on(eventName, (data) => {
      if (!socket.userId || !socket.name || !data?.content) return socket.disconnect();

      logMessage(socket, data.content, eventName);

      const message: ChatResponse = {
        userId: socket.userId,
        name: socket.name,
        message: data.content,
        type: socket.type as 'group' | 'direct',
      };

      if (socket.type === 'group' && socket.groupId) {
        io.to(groupFormat(socket.groupId)).emit(eventName, message);
      } else if (socket.type === 'direct' && socket.receiverId) {
        io.to(directFormat(socket.userId, socket.receiverId)).emit(eventName, message);
      }
    });

    socket.on('disconnect', () => {
      if (logLevel) {
        console.log('A user disconnected:', socket.id);
      }
    });
  });

  return io;
};

const groupFormat = (groupId: string): string => {
  return `group-${groupId}`;
};

const directFormat = (id1: string, id2: string): string => {
  const [lower, greater] = id1 < id2 ? [id1, id2] : [id2, id1];
  return `direct-${lower}-${greater}`;
};

const emitConnectionInfo = (socket: ChatSocket) => {
  socket.emit('connected', {
    userId: socket.userId,
    name: socket.name,
    type: socket.type,
    groupId: socket.groupId,
    receiverId: socket.receiverId,
  });
};

const logConnection = (socket: ChatSocket) => {
  if (!logLevel) return;

  let details = `User ID: ${socket.userId} - Name: ${socket.name} - Sender ID: ${socket.id}`;

  if (socket.type === 'group' && socket.groupId) {
    details += ` - Connected to group with groupId: ${socket.groupId}`;
  } else if (socket.type === 'direct' && socket.receiverId) {
    details += ` - Connected for direct message to ${directFormat(socket.userId!, socket.receiverId)}`;
  } else {
    details += ' - No groupId or receiverId available';
  }

  console.log(details);
};

const logMessage = (socket: ChatSocket, content: string, eventName: string) => {
  if (!logLevel) return;

  let details = `User ID: ${socket.userId} - Message received for event "${eventName}": ${content}`;

  if (socket.type === 'group' && socket.groupId) {
    details += ` - Sent to group with groupId: ${socket.groupId}`;
  } else if (socket.type === 'direct' && socket.receiverId) {
    details += ` - Sent directly to ${directFormat(socket.userId!, socket.receiverId)}`;
  }

  console.log(details);
};

export default setupSocket;
