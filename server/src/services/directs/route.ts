import express from 'express';
import * as directMessageController from './controller';
import { protect } from '@/middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

/**
 * @swagger
 * /api/directs/conversations:
 *   get:
 *     summary: Get all conversations for the current user
 *     tags: [DirectMessages]
 *     description: Retrieves all direct message conversations for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Conversations retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 1
 *                       otherUser:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 2
 *                           username:
 *                             type: string
 *                             example: johndoe
 *                           avatar:
 *                             type: string
 *                             example: https://example.com/avatar.jpg
 *                           isOnline:
 *                             type: boolean
 *                             example: true
 *                       lastMessage:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: 1-2023-01-01T00:00:00Z-2
 *                           content:
 *                             type: string
 *                             example: Hello there!
 *                           sentAt:
 *                             type: string
 *                             format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - token is missing or invalid
 */
router.get('/conversations', directMessageController.getConversations);

/**
 * @swagger
 * /api/directs/conversations/{conversationId}:
 *   get:
 *     summary: Get messages in a conversation
 *     tags: [DirectMessages]
 *     description: Retrieves all messages in a specific direct message conversation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the conversation
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Messages retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 1-2023-01-01T00:00:00Z-2
 *                       content:
 *                         type: string
 *                         example: Hello, how are you?
 *                       senderId:
 *                         type: integer
 *                         example: 1
 *                       receiverId:
 *                         type: integer
 *                         example: 2
 *                       conversationId:
 *                         type: string
 *                         example: conv123
 *                       sentAt:
 *                         type: string
 *                         format: date-time
 *                       sender:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           username:
 *                             type: string
 *                             example: johndoe
 *                           avatar:
 *                             type: string
 *                             example: https://example.com/avatar.jpg
 *       401:
 *         description: Unauthorized - token is missing or invalid
 *       403:
 *         description: Not authorized to access this conversation
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:conversationId', directMessageController.getConversationMessages);

/**
 * @swagger
 * /api/directs/conversations:
 *   post:
 *     summary: Create a new conversation
 *     tags: [DirectMessages]
 *     description: Creates a new direct message conversation with another user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId]
 *             properties:
 *               receiverId:
 *                 type: integer
 *                 example: 2
 *                 description: The ID of the user to start a conversation with
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 participants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       username:
 *                         type: string
 *       400:
 *         description: Invalid request or participant ID
 *       401:
 *         description: Unauthorized - token is missing or invalid
 *       404:
 *         description: Participant user not found
 */
router.post('/conversations', directMessageController.createConversation);

/**
 * @swagger
 * /api/directs/messages:
 *   post:
 *     summary: Send a message
 *     tags: [DirectMessages]
 *     description: Sends a direct message to an existing conversation.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId, content]
 *             properties:
 *               conversationId:
 *                 type: integer
 *                 example: 1
 *                 description: The ID of the conversation
 *               content:
 *                 type: string
 *                 example: Hello, how are you?
 *                 description: The message content
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 42
 *                 content:
 *                   type: string
 *                   example: Hello, how are you?
 *                 senderId:
 *                   type: integer
 *                   example: 1
 *                 conversationId:
 *                   type: integer
 *                   example: 5
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - token is missing or invalid
 *       404:
 *         description: Conversation not found
 */
router.post('/messages', directMessageController.sendMessage);

export default router;
