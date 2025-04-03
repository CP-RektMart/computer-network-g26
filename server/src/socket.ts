import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();
const logLevel: string = process.env.LOG_REQUESTS || '';

export interface SocketHandler {
  (server: Server, eventName: string, socket: Socket, data: any): void;
}

const setupSocket = (server: HttpServer, eventName: string, handler: SocketHandler): Server => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    if (logLevel) {
      console.log('A user connected:', socket.id);
    }

    socket.on(eventName, (data) => {
      if (logLevel) {
        console.log(`Message received for event "${eventName}":`, data);
      }

      handler(io, eventName, socket, data);
    });

    socket.on('disconnect', () => {
      if (logLevel) {
        console.log('A user disconnected:', socket.id);
      }
    });
  });

  return io;
};

export default setupSocket;
