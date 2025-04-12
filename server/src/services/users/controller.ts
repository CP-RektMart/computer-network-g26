import { prisma } from '@/database';
import bcrypt from 'bcryptjs';
import { getGroup } from '@/services/groups/controller';
import { getMessageCount, getMessageRecently, getUnreadMessageCount } from '@/services/rooms/controller';
import { UserChatDetailDto, UserDto } from './type';
import { ChatInfoDto, ParticipantDto } from '../rooms/type';

//  Registers a new user. Checks for existing username and email, hashes the password, and saves the user.
export const registerUser = async (name: string, email: string, password: string): Promise<UserDto> => {
  const existingUsername = await prisma.user.findUnique({
    where: { name },
  });
  if (existingUsername) {
    throw new Error('Username already exists');
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new Error('Email already registered');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      salt,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    registeredAt: user.registeredAt,
    lastLoginAt: undefined,
  };
};

// Authenticates a user by checking the username and password, and returns user details if valid.
export const loginUser = async (name: string, password: string): Promise<UserDto> => {
  const user = await prisma.user.findUnique({
    where: { name },
  });

  if (!user) {
    throw new Error('No user found with this username');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Password is incorrect');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    registeredAt: user.registeredAt,
    lastLoginAt: user.lastLoginAt,
  };
};

// Retrieves a user's details by their ID and returns them if found, otherwise returns null.
export const getUserById = async (id: number): Promise<UserDto | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      registeredAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    registeredAt: user.registeredAt,
    lastLoginAt: user.lastLoginAt,
  };
};

// Retrieves a user's details by their name and returns them if found, otherwise returns null.
export const getUserByUsername = async (name: string): Promise<UserDto | null> => {
  const user = await prisma.user.findUnique({
    where: { name },
    select: {
      id: true,
      email: true,
      name: true,
      registeredAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    registeredAt: user.registeredAt,
    lastLoginAt: user.lastLoginAt,
  };
};

// Checks if a user exists by their ID and returns true if found, otherwise false.
export const isUserExistById = async (userId: number): Promise<boolean> => {
  const user = await prisma.user.count({
    where: { id: userId },
  });
  return user > 0;
};

// Checks if a user exists by their name and returns true if found, otherwise false.
export const isUserExistByUsername = async (name: string): Promise<boolean> => {
  const user = await prisma.user.count({
    where: { name: name },
  });
  return user > 0;
};

// Fetches the chats for a user, including unread message count, last message, and participant details.
export const getChat = async (userId: number): Promise<UserChatDetailDto[]> => {
  const chats = await prisma.room.findMany({
    where: {
      participants: {
        some: {
          userId: userId,
          isLeaved: false,
        },
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

  const userChats = (
    await Promise.all(
      chats.map(async (chat) => {
        const [unreadMessageCount, lastMessage, messageCount] = await Promise.all([
          getUnreadMessageCount(userId, chat.id),
          getMessageRecently(chat.id, 1),
          getMessageCount(chat.id),
        ]);
        const isGroup = chat.type === 'group';

        const group = isGroup ? await getGroup(chat.id) : null;

        const mapped: ParticipantDto[] = chat.participants.map((p) => ({
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
          id: chat.id,
          name: isGroup ? group?.name || 'Unknown Group' : undefined,
          type: chat.type as ChatInfoDto['type'],
          createAt: chat.createdAt,
          lastMessage: lastMessage[0],
          lastSendAt: chat.lastSendAt ?? undefined,
          participants: mapped,
          unread: unreadMessageCount,
          messageCount,
        };

        return userChat;
      })
    )
  ).filter((chat): chat is UserChatDetailDto => chat !== null);

  return userChats;
};

// Retrieves the room IDs for a given user based on their participation in rooms.
export const getChatsId = async (userId: number): Promise<string[]> => {
  const chats = await prisma.roomParticipant.findMany({
    where: {
      userId,
    },
    select: {
      roomId: true,
      room: {
        select: {
          type: true,
        },
      },
    },
  });

  return chats.map((chat) => chat.roomId);
};

export const updateUsername = async (userId: number, newUsername: string): Promise<UserDto> => {
  // Check if the new username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { name: newUsername },
  });

  if (existingUsername) {
    throw new Error('Username already exists');
  }

  // Update the username
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { name: newUsername },
  });

  //TODO: emit socket event to update username in all rooms

  return updatedUser;
};

// TODO: isUserOnline
// TODO: updateUserOnline
// TODO: updateUserOffline
