import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

import { JWT_SECRET, LOG_LEVEL } from '@/env';
import { ChatSocket, socketResponse } from '@/type';
import { isUserExistById } from '@/services/users/controller';
import { updateLastSeenInRoom } from './services/rooms/controller';
import { onSocketRoomConnect, onSocketRoomMessage, onSocketRoomOpening } from './services/rooms/socket';

export let io: Server;
export const userSocketMap = new Map<number, string[]>();

// Socket Channel Names
// Please Note
// The Request and Response will be in the following format

// {
//   status: string, // The status of the message (ok or error)
//   msg: string, // The status message (optional)
//   error: string, // The error message (optional)
//   destination: string, // The room ID to connect to (optional)
//   body: any, // The message body to send (optional)
// }

// These are the channel names used for communication between the client and server
export const channelName = {
  // Channel for connecting to a room (direct & group)
  // for listening to message / group update / user update events
  connectRoom: 'socket-room-connect',

  // Channel for opening a room (direct & group)
  // [to tell] the server that the user is opening a room
  // for updating the last seen timestamp for the user in that room that is used in unread implementation
  openingRoom: 'socket-room-opening',

  // Channel for sending message to a room (direct & group)
  // [to tell] the server that the user is sending a message to a room
  // [to send] the message to the user or to the group members
  message: 'socket-room-message',

  // Channel for sending online status to the server (direct & group)
  // [to tell] the server that the user is online in a room
  // [to send] the online status back to the user or to the group members
  onlineStatus: 'socket-room-online-status',

  // Channel for sending user update to the server (direct & group)
  // [to send] the user update to the user or to the group members
  userUpdate: 'socket-user-update',

  // Channel for sending group update to the server (group only)
  // [to send] the group update to the user or to the group members
  groupUpdate: 'socket-group-update',

  // Channel to notify the receiver that a group message room has been opened
  // [to send] the group message room to the receiver
  groupOpen: 'socket-group-open',

  // Channel to notify the receiver that a direct message room has been opened
  // [to send] the direct message room to the receiver
  directOpen: 'socket-direct-open',
};

// Socket setup function
const setupSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // ---------- Socket Middleware ----------
  io.use(authenticateUserSocket);

  // ---------- Socket Connection Handler ----------
  io.on('connection', async (socket: ChatSocket) => {
    logConnection(socket, 'connection');

    emitConnectionInfo(socket);

    addUserSocket(socket.userId!, socket.id);

    // TODO: call handlerSocketUserOnlineStatus

    socket.on(channelName.connectRoom, onSocketRoomConnect(socket));
    socket.on(channelName.openingRoom, onSocketRoomOpening(socket));
    socket.on(channelName.message, onSocketRoomMessage(socket));
    // TODO: socket-room-online-status

    socket.on('disconnect', async () => {
      logConnection(socket, 'Disconnected');
      if (socket.activeChatId) {
        await updateLastSeenInRoom(socket.userId!, socket.activeChatId);
      }

      // TODO: call handlerSocketUserOfflineStatus

      removeUserSocket(socket.userId!, socket.id);
      socket.leave(socket.id);
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
      return next(new Error('Invalid token payload'));
    }

    const exist = await isUserExistById(decoded.userId);
    if (!exist) {
      return next(Error('User not found'));
    }

    socket.userId = decoded.userId;

    next();
  } catch (error) {
    return next(new Error('Invalid token'));
  }
};

// Function to emit connection information back to the client
const emitConnectionInfo = (socket: ChatSocket) => {
  socket.emit('connection', socketResponse('ok', 'Connected to Socket!'));
};

// Function to log connection information
export const logConnection = (socket: ChatSocket, eventName: string, destination?: string) => {
  if (!LOG_LEVEL) return;

  const target = destination ? ` → [${destination}]` : '';
  const details = `Event: ${eventName} | User ID: ${socket.userId} | Socket ID: ${socket.id}${target}`;

  console.log(details);
};

// Function to add a user socket to the map
export const addUserSocket = (userId: number, socketId: string): void => {
  const sockets = userSocketMap.get(userId) || [];
  if (!sockets.includes(socketId)) {
    sockets.push(socketId);
    userSocketMap.set(userId, sockets);
  }
};

// Function to remove a user socket from the map
export const removeUserSocket = (userId: number, socketId: string): void => {
  const sockets = userSocketMap.get(userId);
  if (!sockets) return;
  const updatedSockets = sockets.filter((id) => id !== socketId);
  if (updatedSockets.length > 0) {
    userSocketMap.set(userId, updatedSockets);
  } else {
    userSocketMap.delete(userId);
  }
};

// Function to get all sockets of a user
export const getUserSockets = (userId: number): string[] => {
  return userSocketMap.get(userId) || [];
};

export default setupSocket;
