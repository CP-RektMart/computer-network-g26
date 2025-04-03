import { SocketHandler } from '@/socket';

/**
 * @swagger
 * components:
 *   schemas:
 *     MessageData:
 *       type: object
 *       properties:
 *         content:
 *           type: string
 *           description: The content of the message being sent.
 *           example: "Hello, how are you?"
 *         senderId:
 *           type: string
 *           description: The ID of the user sending the message.
 *           example: "user123"
 */
export interface MessageData {
  content: string;
  senderId: string;
}

/**
 * @swagger
 * /socket/messages:
 *   post:
 *     summary: Message WebSocket events
 *     description: |
 *       This is not a standard HTTP request-response but represents the WebSocket handler.
 *       Message handled and broadcasted to all clients.
 *     tags: [Socket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageData'
 */
const CustomMessageHandler: SocketHandler = (server, eventName, socket, data: MessageData) => {
  console.log('Handling message:', data);

  // Broadcast the data to everyone
  server.emit(eventName, data);
};

export default CustomMessageHandler;
