import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from 'dotenv';
import { connectToDatabase } from '@/database';

import { handle404, handleError } from '@/error';
import setupSocket from '@/socket';
import requestLogger from '@/logger';
import swaggerDocs from '@/swagger';
import swaggerUi from 'swagger-ui-express';

import userRoutes from '@/services/users/route';

config();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // Enable CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Swagger
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//  Run Prisma Migrations and Connect to the Database
connectToDatabase();

// // Use request logger
app.use(requestLogger);

// Routes
app.use('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'HEALTHY', uptime: process.uptime() });
});
app.use('/api/users', userRoutes);

// Setup Socket IO
setupSocket(server, '/socket/messages');

// 404 Handler & Global Error Handler
app.use(handle404);
app.use(handleError);

// Open Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
