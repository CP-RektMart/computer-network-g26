import { prisma } from '@/database';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserChatDetailDto } from '@/services/users/type';
import { ChatInfoDto, ParticipantDto } from '@/services/rooms/type';
import { getMessageCount, getMessageRecently, getRoomType, getUnreadMessageCount, isParticipantOfRoom } from '@/services/rooms/controller';

// This function creates a new group chat with the specified details and participants.
export const createGroup = async (
  groupName: string,
  description: string,
  ownerUserId: number,
  participantIds: number[],
  password: string | undefined
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

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = password ? await bcrypt.hash(password, salt) : undefined;

  const newGroup = await prisma.group.create({
    data: {
      name: groupName,
      description: description,
      id: newRoom.id,
      havePassword: !!password,
      password: hashedPassword,
      salt: password ? salt : undefined,
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

  return {
    id: newGroup.id,
    name: newGroup.name,
    lastMessage: undefined,
    lastSentAt: undefined,
    createAt: newRoom.createdAt,
    type: 'group',
    participantCount: mapped.length,
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

export const updateGroupPassword = async (groupId: string, password: string | null) => {
  if (password === null) {
    // Remove password
    await prisma.group.update({
      where: { id: groupId },
      data: {
        password: undefined,
        salt: undefined,
        havePassword: false,
      },
    });
  } else {
    // Update with new hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.group.update({
      where: { id: groupId },
      data: {
        password: hashedPassword,
        salt: salt,
        havePassword: true,
      },
    });
  }
};

export const checkPassword = async (groupId: string, inputPassword: string): Promise<boolean> => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    return false;
  }

  if (!group.havePassword || !group.password) {
    return true;
  }

  const isMatch = await bcrypt.compare(inputPassword, group.password);
  return isMatch;
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
export const getAllGroup = async (): Promise<ChatInfoDto[]> => {
  const groups = await prisma.group.findMany({
    include: {
      room: {
        select: {
          _count: {
            select: {
              participants: true,
            },
          },
        },
      },
    },
  });

  const mapped: ChatInfoDto[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: 'group',
    participantCount: group.room._count.participants,
    havePassword: group.havePassword,
  }));

  return mapped;
};
// Retrieves the details of a specific group chat by its ID.
export const getGroup = async (groupId: string): Promise<ChatInfoDto | null> => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      room: {
        select: {
          _count: {
            select: {
              participants: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    return null;
  }

  return {
    id: group.id,
    name: group.name,
    type: 'group',
    participantCount: group.room._count.participants,
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

  const mapped: ParticipantDto[] = room.participants.map((p) => ({
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

  const userChat: UserChatDetailDto = {
    id: room.id,
    name: isGroup ? group?.name || 'Unknown Group' : undefined,
    type: room.type as ChatInfoDto['type'],
    createAt: room.createdAt,
    lastMessage: lastMessage[0],
    lastSentAt: room.lastSentAt ?? undefined,
    participants: mapped,
    unread: unreadMessageCount,
    messageCount,
    participantCount: mapped.length,
  };

  return [
    {
      id: participant.userId,
      email: participant.user.email,
      joinedAt: participant.joinedAt,
      lastLoginAt: participant.user.lastLoginAt,
      username: participant.user.username,
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
        isLeaved: false,
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
        username: participant.user.username,
        registeredAt: participant.user.registeredAt,
        lastLoginAt: participant.user.lastLoginAt,
        role: participant.role,
        isOnline: participant.user.isOnline,
        isLeaved: participant.isLeaved,
        joinedAt: participant.joinedAt,
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
