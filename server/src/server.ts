import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { connectToDatabase } from '@/database';
import { handle404, handleError } from '@/error';
import requestLogger from '@/logger';
import swaggerDocs from '@/swagger';
import setupSocket from '@/socket';

import userRoutes from '@/services/users/route';
import groupRoutes from '@/services/groups/route';
import roomRoutes from '@/services/rooms/route';
import directRoutes from '@/services/directs/route';

config();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Swagger
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//  Connect to the Database
connectToDatabase();

// // Use request logger
app.use(requestLogger);

// Routes
app.use('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'HEALTHY', uptime: process.uptime() });
});
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/directs', directRoutes);

// Setup Socket IO
setupSocket(server);

// 404 Handler & Global Error Handler
app.use(handle404);
app.use(handleError);

// Open Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
