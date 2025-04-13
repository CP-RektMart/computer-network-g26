import { prisma } from '@/database';
import * as crypto from 'crypto';
import { UserChatDetailDto } from '@/services/users/type';
import { ChatInfoDto, ParticipantDto } from '@/services/rooms/type';
import { getMessageCount, getMessageRecently, getRoomType, getUnreadMessageCount, isParticipantOfRoom } from '@/services/rooms/controller';

// This function creates a new group chat with the specified details and participants.
export const createGroup = async (
  groupName: string,
  description: string,
  ownerUserId: number,
  participantIds: number[]
): Promise<UserChatDetailDto> => {
  const uniqueId = crypto.randomBytes(8).toString('hex').slice(0, 16);
  const newRoom = await prisma.room.create({
    data: {
      id: uniqueId,
      type: 'group',
      participants: {
        create: participantIds.map((userId) => ({
          userId: userId,
          role: userId === ownerUserId ? 'admin' : 'member',
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

  const newGroup = await prisma.group.create({
    data: {
      name: groupName,
      description: description,
      id: newRoom.id,
    },
  });

  const mapped: ParticipantDto[] = newRoom.participants.map((p) => ({
    id: p.userId,
    name: p.user.name,
    email: p.user.email,
    joinedAt: p.joinedAt,
    joinAt: p.joinedAt,
    role: p.role,
    registeredAt: p.user.registeredAt,
    lastLoginAt: p.user.lastLoginAt,
    isOnline: p.user.isOnline,
    isLeaved: p.isLeaved,
  }));

  return {
    id: newGroup.id,
    name: newGroup.name,
    lastMessage: undefined,
    lastSendAt: undefined,
    createAt: newRoom.createdAt,
    type: 'group',
    participants: mapped,
    unread: 0,
    messageCount: 0,
  };
};

// This function updates the details of an existing group chat.
export const updateGroup = async (groupId: string, groupName: string, description: string, groupAvatar?: string): Promise<void> => {
  const dataToUpdate: any = {
    name: groupName,
    description: description,
  };

  if (groupAvatar) {
    dataToUpdate.avatar = groupAvatar;
  }

  await prisma.group.update({
    where: { id: groupId },
    data: dataToUpdate,
  });
};

// This function deletes a group chat and all its associated data.
export const deleteGroup = async (groupId: string): Promise<void> => {
  await prisma.roomParticipant.deleteMany({
    where: { roomId: groupId },
  });

  await prisma.message.deleteMany({
    where: { roomId: groupId },
  });

  await prisma.group.delete({
    where: { id: groupId },
  });

  await prisma.room.delete({ where: { id: groupId } });
};

// Retrieves the details of a specific group chat by its ID.
export const getGroup = async (groupId: string): Promise<ChatInfoDto | null> => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    return null;
  }

  return {
    id: group.id,
    name: group.name,
    type: 'group',
  };
};

// Adds a user to a group if not already a participant, and returns participant details
export const joinGroup = async (userId: number, groupId: string): Promise<[ParticipantDto | null, UserChatDetailDto | null]> => {
  const isMember = await isParticipantOfRoom(userId, groupId);
  if (isMember) {
    return [null, null];
  }

  const roomType = await getRoomType(groupId);
  if (roomType === 'direct') {
    return [null, null]; // Cannot join a direct room
  }

  const participant = await prisma.roomParticipant.upsert({
    where: {
      userId_roomId: {
        userId: userId,
        roomId: groupId,
      },
    },
    update: {
      isLeaved: false,
      role: 'member',
    },
    create: {
      roomId: groupId,
      userId: userId,
      role: 'member',
    },
    include: {
      user: true,
    },
  });

  const room = await prisma.room.findUnique({
    where: { id: groupId },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!room) {
    return [null, null];
  }

  const [unreadMessageCount, lastMessage, messageCount] = await Promise.all([
    getUnreadMessageCount(userId, room.id),
    getMessageRecently(room.id, 1),
    getMessageCount(room.id),
  ]);
  const isGroup = room.type === 'group';

  const group = isGroup ? await getGroup(room.id) : null;
  const otherMember = !isGroup ? room.participants.find((m) => m.user.id !== userId) : null;

  const mapped: ParticipantDto[] = room.participants.map((p) => ({
    id: p.userId,
    name: p.user.name,
    email: p.user.email,
    joinedAt: p.joinedAt,
    joinAt: p.joinedAt,
    role: p.role,
    registeredAt: p.user.registeredAt,
    lastLoginAt: p.user.lastLoginAt,
    isOnline: p.user.isOnline,
    isLeaved: p.isLeaved,
  }));

  const userChat: UserChatDetailDto = {
    id: room.id,
    name: isGroup ? group?.name || 'Unknown Group' : otherMember?.user.name || 'Unknown User',
    type: room.type as ChatInfoDto['type'],
    createAt: room.createdAt,
    lastMessage: lastMessage[0],
    lastSendAt: room.lastSendAt ?? undefined,
    participants: mapped,
    unread: unreadMessageCount,
    messageCount,
  };

  return [
    {
      id: participant.userId,
      email: participant.user.email,
      joinAt: participant.joinedAt,
      lastLoginAt: participant.user.lastLoginAt,
      name: participant.user.name,
      registeredAt: participant.user.registeredAt,
      role: participant.role,
      isOnline: participant.user.isOnline,
      isLeaved: participant.isLeaved,
    },
    userChat,
  ];
};

// Removes a user from a group
export const leaveGroup = async (userId: number, groupId: string): Promise<ParticipantDto | null> => {
  let newAdmin: ParticipantDto | null = null;
  const roomType = await getRoomType(groupId);
  if (roomType === 'direct') {
    return null; // Cannot join a direct room
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: {
      userId_roomId: {
        userId: userId,
        roomId: groupId,
      },
    },
  });

  if (!participant) {
    return null; // User is not a participant of the room
  }

  if (participant.isLeaved) {
    return null; // User has already left the room
  }

  if (participant.role === 'admin') {
    // If the user is an admin, we need to assign the admin role to another participant
    const otherParticipants = await prisma.roomParticipant.findMany({
      where: {
        roomId: groupId,
        userId: { not: userId },
      },
    });
    if (otherParticipants.length > 0) {
      const participant = await prisma.roomParticipant.update({
        where: {
          userId_roomId: {
            userId: otherParticipants[0].userId,
            roomId: groupId,
          },
          isLeaved: false,
        },
        data: {
          role: 'admin',
        },
        include: {
          user: true,
        },
      });
      newAdmin = {
        id: participant.user.id,
        email: participant.user.email,
        name: participant.user.name,
        registeredAt: participant.user.registeredAt,
        lastLoginAt: participant.user.lastLoginAt,
        role: participant.role,
        isOnline: participant.user.isOnline,
        isLeaved: participant.isLeaved,
        joinAt: participant.joinedAt,
      };
    } else {
      deleteGroup(groupId); // If no other participants, delete the group
      return null;
    }
  }

  await prisma.room.update({
    where: { id: groupId },
    data: {
      participants: {
        update: {
          where: { userId_roomId: { userId, roomId: groupId } },
          data: {
            isLeaved: true,
          },
        },
      },
    },
  });

  return newAdmin;
};
