import { Request, Response } from 'express';
import { prisma } from '@/database';
import { createDirectConversation } from './socket';

// Get all conversations for a user
export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.userId ?? '');

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const conversations = await prisma.directConversation.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          },
        },
        messages: {
          orderBy: {
            sentAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data to return the other user (not the current user)
    const transformedConversations = conversations.map((conv) => {
      const otherUser = conv.senderId === userId ? conv.receiver : conv.sender;
      return {
        id: conv.id,
        otherUser,
        lastMessage: conv.messages[0] || null,
        createdAt: conv.createdAt,
      };
    });

    res.json({
      status: 'ok',
      message: 'Conversations retrieved successfully',
      data: transformedConversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch conversations',
    });
  }
};

// Get messages in a conversation
export const getConversationMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = parseInt(req.userId ?? '');

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    // Verify user is part of conversation
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
      select: { senderId: true, receiverId: true },
    });

    if (!conversation) {
      res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
      return;
    }

    if (conversation.senderId !== userId && conversation.receiverId !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this conversation',
      });
      return;
    }

    const messages = await prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.json({
      status: 'ok',
      message: 'Messages retrieved successfully',
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch messages',
    });
  }
};

// Create a new conversation
export const createConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { receiverId } = req.body;
    const senderId = parseInt(req.userId ?? '');

    if (!senderId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    if (senderId === parseInt(receiverId)) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot create a conversation with yourself',
      });
      return;
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: parseInt(receiverId) },
    });

    if (!receiver) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Create conversation (or get existing one)
    const conversation = await createDirectConversation(senderId, parseInt(receiverId));

    res.status(201).json({
      status: 'ok',
      message: 'Conversation created successfully',
      data: conversation,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create conversation',
    });
  }
};

// Send a message (REST API version)
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, content } = req.body;
    const senderId = parseInt(req.userId ?? '');

    if (!senderId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    // Verify conversation exists and user is part of it
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
      return;
    }

    if (conversation.senderId !== senderId && conversation.receiverId !== senderId) {
      res.status(403).json({
        status: 'error',
        message: 'Not authorized to send messages in this conversation',
      });
      return;
    }

    const receiverId = conversation.senderId === senderId ? conversation.receiverId : conversation.senderId;

    // Create the message
    const sentAt = new Date();
    const message = await prisma.directMessage.create({
      data: {
        id: `${senderId}-${sentAt.toISOString()}-${receiverId}`,
        senderId,
        receiverId,
        conversationId,
        content,
        sentAt,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'ok',
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
    });
  }
};
