import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

import { JWT_SECRET, LOG_LEVEL } from '@/env';
import { ChatSocket, ConnectedResDto } from '@/socket-type';
import { getUserById, isUserExistById } from '@/services/users/controller';
import { handleGroupJoin, handleGroupLeave, handleGroupOpen, handleMessage } from '@/services/groups/socket';
import { handleDirectJoin, handleDirectLeave, handleDirectOpen, handleDirectMessage } from '@/services/directs/socket';
import { handleUserOfflineStatus, handleUserOnlineStatus } from '@/services/users/socket';

const setupSocket = (server: HttpServer): Server => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // ---------- Middleware to authenticate the user using JWT ----------
  io.use(authenticateUserSocket);

  // ---------- Listen for incoming connections ----------
  io.on('connection', async (socket: ChatSocket) => {
    logConnection(socket, 'Connected');

    // Emit the Connected Connection Back
    const user = await getUserById(socket.userId!);
    emitConnectionInfo(socket, user);

    // Handle user online status
    await handleUserOnlineStatus(socket, io);

    // Handle group socket events
    socket.on('socket-group-join', (req) => handleGroupJoin('socket-group-join', 'socket-group-activity', 'socket-group-message', socket, req));
    socket.on('socket-group-open', (req) => handleGroupOpen(socket, req));
    socket.on('socket-group-leave', (req) => handleGroupLeave('socket-group-leave', 'socket-group-activity', socket, req));
    socket.on('socket-group-message', (req) => handleMessage('socket-group-message', socket, req, io));

    // Handle direct message socket events
    socket.on('socket-direct-join', (req) => handleDirectJoin('socket-direct-join', 'socket-direct-message', socket, io, req));
    socket.on('socket-direct-open', (req) => handleDirectOpen(socket, req));
    socket.on('socket-direct-leave', (req) => handleDirectLeave('socket-direct-leave', socket, req));
    socket.on('socket-direct-message', (req) => handleDirectMessage('socket-direct-message', socket, io, req));

    socket.on('disconnect', async () => {
      logConnection(socket, 'Disconnected');

      // Handle user offline status
      await handleUserOfflineStatus(socket, io);
    });
  });

  return io;
};

// Middleware for user authentication
const authenticateUserSocket = async (socket: ChatSocket, next: (err?: any) => void) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Token missing'));

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (!decoded.userId) {
      throw new Error('Invalid token payload');
    }

    const exist = await isUserExistById(decoded.userId);
    if (!exist) {
      throw new Error('User not found');
    }

    socket.userId = decoded.userId;

    next();
  } catch (error) {
    return next(new Error('Invalid token'));
  }
};

const emitConnectionInfo = (socket: ChatSocket, user: any) => {
  const res: ConnectedResDto = {
    status: 'ok',
    message: 'Connected to Socket!',
    user: user,
  };
  socket.emit('connection', res);
};

const logConnection = (socket: ChatSocket, connection: string) => {
  if (!LOG_LEVEL) return;

  let details = `User ID: ${socket.userId} - Name: ${socket.username} - Sender ID: ${socket.id} ${connection} !!`;

  console.log(details);
};

export default setupSocket;
