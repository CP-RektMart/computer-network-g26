import { Server } from 'socket.io';
import { ChatSocket } from '@/socket-type';
import { prisma } from '@/database';

// Handle when a user joins a direct conversation
export const handleDirectJoin = async (eventName: string, messageEventName: string, socket: ChatSocket, io: Server, req: any) => {
  try {
    const { conversationId } = req;
    const userId = socket.userId;

    if (!userId || !conversationId) {
      socket.emit(eventName, {
        status: 'error',
        message: 'Invalid request data',
      });
      return;
    }

    // Verify the conversation exists and user is part of it
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true, isOnline: true },
        },
        receiver: {
          select: { id: true, username: true, avatar: true, isOnline: true },
        },
      },
    });

    if (!conversation) {
      socket.emit(eventName, {
        status: 'error',
        message: 'Conversation not found',
      });
      return;
    }

    // Ensure user is part of this conversation
    if (conversation.senderId !== userId && conversation.receiverId !== userId) {
      socket.emit(eventName, {
        status: 'error',
        message: 'Not authorized to join this conversation',
      });
      return;
    }

    // Join the socket room for this conversation
    const roomName = `direct:${conversationId}`;
    socket.join(roomName);

    // Get recent messages
    const messages = await prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'desc' },
      take: 50,
      include: {
        sender: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // Determine the other user in the conversation
    const otherUser = conversation.senderId === userId ? conversation.receiver : conversation.sender;

    socket.emit(eventName, {
      status: 'ok',
      message: 'Joined direct conversation',
      data: {
        conversation,
        otherUser,
        messages: messages.reverse(),
      },
    });

    // Notify the other user that this user has joined
    const otherUserId = otherUser.id;
    io.to(`user:${otherUserId}`).emit('socket-direct-activity', {
      status: 'ok',
      message: 'User joined conversation',
      data: {
        conversationId,
        userId,
        action: 'join',
      },
    });
  } catch (error) {
    console.error('Error in handleDirectJoin:', error);
    socket.emit(eventName, {
      status: 'error',
      message: 'Failed to join conversation',
    });
  }
};

// Handle when a user opens a direct conversation (marks messages as read)
export const handleDirectOpen = async (socket: ChatSocket, req: any) => {
  try {
    const { conversationId } = req;
    const userId = socket.userId;

    if (!userId || !conversationId) {
      socket.emit('socket-direct-open', {
        status: 'error',
        message: 'Invalid request data',
      });
      return;
    }

    // Verify conversation exists and user is part of it
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      socket.emit('socket-direct-open', {
        status: 'error',
        message: 'Conversation not found',
      });
      return;
    }

    if (conversation.senderId !== userId && conversation.receiverId !== userId) {
      socket.emit('socket-direct-open', {
        status: 'error',
        message: 'Not authorized to access this conversation',
      });
      return;
    }

    // Here you would typically update message read status if needed
    // For now just returning success response
    socket.emit('socket-direct-open', {
      status: 'ok',
      message: 'Conversation opened',
      data: { conversationId },
    });
  } catch (error) {
    console.error('Error in handleDirectOpen:', error);
    socket.emit('socket-direct-open', {
      status: 'error',
      message: 'Failed to open conversation',
    });
  }
};

// Handle when a user leaves a direct conversation
export const handleDirectLeave = async (eventName: string, socket: ChatSocket, req: any) => {
  try {
    const { conversationId } = req;
    const userId = socket.userId;

    if (!userId || !conversationId) {
      socket.emit(eventName, {
        status: 'error',
        message: 'Invalid request data',
      });
      return;
    }

    // Leave the socket room
    const roomName = `direct:${conversationId}`;
    socket.leave(roomName);

    socket.emit(eventName, {
      status: 'ok',
      message: 'Left direct conversation',
      data: { conversationId },
    });
  } catch (error) {
    console.error('Error in handleDirectLeave:', error);
    socket.emit(eventName, {
      status: 'error',
      message: 'Failed to leave conversation',
    });
  }
};

// Handle sending a direct message
export const handleDirectMessage = async (eventName: string, socket: ChatSocket, io: Server, req: any) => {
  try {
    const { conversationId, content } = req;
    const senderId = socket.userId;

    if (!senderId || !conversationId || !content) {
      socket.emit(eventName, {
        status: 'error',
        message: 'Invalid message data',
      });
      return;
    }

    // Verify conversation exists and user is part of it
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      socket.emit(eventName, {
        status: 'error',
        message: 'Conversation not found',
      });
      return;
    }

    if (conversation.senderId !== senderId && conversation.receiverId !== senderId) {
      socket.emit(eventName, {
        status: 'error',
        message: 'Not authorized to send messages in this conversation',
      });
      return;
    }

    // Determine recipient
    const receiverId = conversation.senderId === senderId ? conversation.receiverId : conversation.senderId;

    // Create timestamp
    const sentAt = new Date();

    // Create message
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

    // Broadcast to the direct conversation room
    const roomName = `direct:${conversationId}`;
    io.to(roomName).emit(eventName, {
      status: 'ok',
      message: 'New message',
      data: message,
    });

    // Also emit to the recipient's personal room
    io.to(`user:${receiverId}`).emit('socket-direct-notification', {
      status: 'ok',
      message: 'New direct message',
      data: {
        conversationId,
        senderId,
        message,
      },
    });

    // Success response to sender
    socket.emit(`${eventName}-ack`, {
      status: 'ok',
      message: 'Message sent',
      data: { messageId: message.id },
    });
  } catch (error) {
    console.error('Error in handleDirectMessage:', error);
    socket.emit(eventName, {
      status: 'error',
      message: 'Failed to send message',
    });
  }
};

// Create a new conversation
export const createDirectConversation = async (senderId: number, receiverId: number) => {
  try {
    // Check if conversation already exists
    const existingConversation = await prisma.directConversation.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
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
    });

    if (existingConversation) {
      const otherUser = existingConversation.senderId === senderId ? existingConversation.receiver : existingConversation.sender;

      const lastMessage = existingConversation.messages[0] || null;

      return {
        id: existingConversation.id,
        otherUser: {
          id: otherUser.id,
          username: otherUser.username,
          avatar: otherUser.avatar,
          isOnline: otherUser.isOnline,
        },
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              receiverId: lastMessage.receiverId,
              content: lastMessage.content,
              sentAt: lastMessage.sentAt,
              conversationId: lastMessage.conversationId,
            }
          : null,
        createdAt: existingConversation.createdAt,
      };
    }

    // Create new conversation
    const newConversation = await prisma.directConversation.create({
      data: {
        senderId,
        receiverId,
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
    });

    const otherUser = newConversation.senderId === senderId ? newConversation.receiver : newConversation.sender;

    const lastMessage = newConversation.messages[0] || null;

    return {
      id: newConversation.id,
      otherUser: {
        id: otherUser.id,
        username: otherUser.username,
        avatar: otherUser.avatar,
        isOnline: otherUser.isOnline,
      },
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            senderId: lastMessage.senderId,
            receiverId: lastMessage.receiverId,
            content: lastMessage.content,
            sentAt: lastMessage.sentAt,
            conversationId: lastMessage.conversationId,
          }
        : null,
      createdAt: newConversation.createdAt,
    };
  } catch (error) {
    console.error('Error creating direct conversation:', error);
    throw error;
  }
};
