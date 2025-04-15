import { prisma } from '@/database';
import * as crypto from 'crypto';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { MessageContentDto, MessageDto, ParticipantDto } from './type';

// Checks if a room exists by counting the entries in the room table
export const isRoomExist = async (roomId: string): Promise<boolean> => {
  const roomCount = await prisma.room.count({ where: { id: roomId } });
  return roomCount > 0; // Returns true if room exists, false otherwise
};

// Retrieves the type of a room (e.g., 'group', 'direct') by its ID
export const getRoomType = async (roomId: string): Promise<string> => {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { type: true } });
  return room?.type || 'null';
};

// Retrieves the list of participants for a given room
export const getParticipantOfRoom = async (roomId: string): Promise<ParticipantDto[]> => {
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId: roomId },
    include: {
      user: true,
    },
  });

  const mapped: ParticipantDto[] = participants.map((p) => ({
    id: p.userId,
    username: p.user.username,
    email: p.user.email,
    joinedAt: p.joinedAt,
    joinAt: p.joinedAt,
    role: p.role,
    registeredAt: p.user.registeredAt,
    lastLoginAt: p.user.lastLoginAt,
    isOnline: p.user.isOnline,
    isLeaved: p.isLeaved,
  }));

  return mapped;
};

// Checks if a user is a participant of a specific room
export const isParticipantOfRoom = async (userId: number, roomId: string): Promise<boolean> => {
  const participant = await prisma.roomParticipant.findFirst({
    where: {
      userId,
      roomId,
      isLeaved: false,
    },
  });

  return !!participant;
};

// Retrieves specific participant details from a specific room
export const getParticipant = async (userId: number, roomId: string): Promise<ParticipantDto | null> => {
  const participant = await prisma.roomParticipant.findUnique({
    where: { userId_roomId: { userId, roomId: roomId } },
    include: {
      room: {
        include: {
          participants: true,
        },
      },
      user: true,
    },
  });

  if (!participant) {
    return null;
  }

  return {
    id: participant.userId,
    username: participant.user.username,
    email: participant.user.email,
    joinedAt: participant.joinedAt,
    registeredAt: participant.user.registeredAt,
    role: participant.role,
    lastLoginAt: participant.user.lastLoginAt,
    isOnline: participant.user.isOnline,
    isLeaved: participant.isLeaved,
  };
};

// Saves a message to the database and returns the saved message data
export const saveMessage = async (
  roomId: string,
  senderType: string,
  senderId: number | null,
  sentAt: Date,
  content: InputJsonValue
): Promise<MessageDto> => {
  const base = `${sentAt.getTime()}-${senderId}-${roomId}`;
  const randomString = Math.random().toString(36).substring(2, 10);
  const uniqueId = crypto
    .createHash('md5')
    .update(base + randomString)
    .digest('hex')
    .slice(0, 16);

  const savedMessage = await prisma.message.create({
    data: {
      id: uniqueId,
      content,
      roomId,
      senderId,
      sentAt,
      senderType,
    },
  });

  return {
    id: savedMessage.id,
    sentAt: savedMessage.sentAt,
    senderType: savedMessage.senderType,
    senderId: savedMessage.senderId,
    content: savedMessage.content as MessageContentDto,
    isEdited: savedMessage.isEdited,
  };
};

// Retrieves messages from a room sent before a specified date, limited by the given number
export const getMessageBefore = async (roomId: string, limit: number, before: Date): Promise<MessageDto[]> => {
  const messages = await prisma.message.findMany({
    where: {
      roomId: roomId,
      sentAt: {
        lt: before,
      },
    },
    take: limit,
    orderBy: {
      sentAt: 'desc',
    },
  });

  return messages.map((message) => ({
    id: message.id,
    senderType: message.senderType,
    senderId: message.senderId,
    sentAt: message.sentAt,
    content: message.content as MessageContentDto,
    isEdited: message.isEdited,
  }));
};

// Retrieves the most recent messages from a room, limited by the given number
export const getMessageRecently = async (roomId: string, limit: number): Promise<MessageDto[]> => {
  const messages = await prisma.message.findMany({
    where: {
      roomId: roomId,
    },
    take: limit,
    orderBy: {
      sentAt: 'desc',
    },
  });

  return messages.map((message) => ({
    id: message.id,
    senderType: message.senderType,
    senderId: message.senderId,
    sentAt: message.sentAt,
    content: message.content as MessageContentDto,
    isEdited: message.isEdited,
  }));
};

export const getMessageCount = async (roomId: string): Promise<number> => {
  const count = await prisma.message.count({
    where: {
      roomId: roomId,
    },
  });

  return count;
};

// Retrieves unread messages for a user in a specific room since their last seen time
export const getUnreadMessage = async (userId: number, roomId: string): Promise<MessageDto[]> => {
  const member = await prisma.roomParticipant.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
    },
    select: {
      lastSeemAt: true,
    },
  });

  if (!member) return [];

  const unreadMessages = await prisma.message.findMany({
    where: {
      roomId,
      sentAt: {
        gt: member.lastSeemAt || new Date(0),
      },
      senderId: {
        not: userId,
      },
    },
    orderBy: {
      sentAt: 'desc',
    },
  });

  return unreadMessages.map((message) => ({
    id: message.id,
    senderType: message.senderType,
    senderId: message.senderId,
    sentAt: message.sentAt,
    content: message.content as MessageContentDto,
    isEdited: message.isEdited,
  }));
};

// Retrieves unread message count for a user in a specific room since their last seen time
export const getUnreadMessageCount = async (userId: number, roomId: string): Promise<number> => {
  const member = await prisma.roomParticipant.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
      isLeaved: false,
    },
    select: {
      lastSeemAt: true,
    },
  });

  if (!member) return 0;

  const count = await prisma.message.count({
    where: {
      roomId,
      sentAt: {
        gt: member.lastSeemAt || new Date(0),
      },
      senderId: {
        not: userId,
      },
    },
  });

  return count;
};

// Updates the last seen timestamp for a user in a specific room
export const updateLastSeenInRoom = async (userId: number, roomId: string) => {
  await prisma.roomParticipant.update({
    where: {
      userId_roomId: {
        userId: userId,
        roomId: roomId,
      },
    },
    data: {
      lastSeemAt: new Date(),
    },
  });
};
