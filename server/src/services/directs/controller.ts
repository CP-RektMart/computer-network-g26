import { prisma } from '@/database';
import * as crypto from 'crypto';
import { UserChatDetailDto } from '@/services/users/type';
import { ParticipantDto } from '@/services/rooms/type';

// This function formats the direct chat ID based on the two user IDs provided.
// It ensures that the smaller ID comes first in the format "lower-greater".
export const directFormat = (id1: number, id2: number): string => {
  const [lower, greater] = id1 < id2 ? [id1, id2] : [id2, id1];
  return `${lower}-${greater}`;
};

// This function creates a direct chat between two users identified by their IDs.
export const createDirect = async (senderId: number, receiverId: number): Promise<[UserChatDetailDto | null, UserChatDetailDto | null]> => {
  const base = directFormat(senderId, receiverId);
  const uniqueId = crypto.createHash('md5').update(base).digest('hex').slice(0, 16);

  const isExist = await prisma.room.findUnique({
    where: {
      id: uniqueId,
    },
  });

  if (isExist) {
    return [null, null];
  }

  const newRoom = await prisma.room.create({
    data: {
      id: uniqueId,
      type: 'direct',
      participants: {
        create: [senderId, receiverId].map((userId) => ({
          userId,
          role: 'member',
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });

  const mapped: ParticipantDto[] = newRoom.participants.map((p) => ({
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

  return [
    {
      id: newRoom.id,
      name: undefined,
      lastMessage: undefined,
      lastSentAt: undefined,
      createAt: newRoom.createdAt,
      type: 'direct',
      participants: mapped,
      unread: 0,
      messageCount: 0,
    },
    {
      id: newRoom.id,
      name: undefined,
      lastMessage: undefined,
      lastSentAt: undefined,
      createAt: newRoom.createdAt,
      type: 'direct',
      participants: mapped,
      unread: 0,
      messageCount: 0,
    },
  ];
};
