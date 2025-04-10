import { prisma } from '@/database';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { fetchFromCacheOrDb, redis } from '@/redis';

//@desc    Register User
//@route   POST /api/users/register
//@access  Public
export const registerUser = async (username: string, email: string, password: string): Promise<User> => {
  const existingUsername = await prisma.user.findUnique({
    where: { username },
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
      username,
      email,
      password: hashedPassword,
      salt,
    },
  });

  return user;
};

//@desc    Login User
//@route   POST /api/users/login
//@access  Public
export const loginUser = async (username: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new Error('No user found with this username');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Password is incorrect');
  }

  return user;
};

//@desc    Get User by ID
//@route   GET /api/users/:id
//@access  Public
export const getUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      lastSeenAt: true,
      groupMemberships: {
        select: {
          role: true,
          group: {
            select: {
              id: true,
              name: true,
              lastSendAt: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const chat = user.groupMemberships.map((membership) => ({
    chatId: membership.group.id,
    type: 'group',
    last_seem_at: membership.group.lastSendAt,
  }));

  // Sort by last_seem_at descending
  chat.sort((a, b) => b.last_seem_at.getTime() - a.last_seem_at.getTime());

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    lastSendAt: user.lastSeenAt,
    chat,
  };
};

//@desc    Get User by Username
//@route   GET /api/users/username/:username
//@access  Public
export const getUserByUsername = async (username: string) => {
  const user = await prisma.user.findUnique({
    where: { username: username },
    select: {
      id: true,
      email: true,
      username: true,
      lastSeenAt: true,
      groupMemberships: {
        select: {
          role: true,
          group: {
            select: {
              id: true,
              name: true,
              lastSendAt: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const chat = user.groupMemberships.map((membership) => ({
    chatId: membership.group.id,
    type: 'group',
    last_seem_at: membership.group.lastSendAt,
  }));

  // Sort by last_seem_at descending
  chat.sort((a, b) => b.last_seem_at.getTime() - a.last_seem_at.getTime());

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    lastSendAt: user.lastSeenAt,
    chat,
  };
};

export const isUserExistById = async (userId: number): Promise<boolean> => {
  const user = await prisma.user.count({
    where: { id: userId },
  });
  return user > 0;
};

export const isUserExistByUsername = async (username: string): Promise<boolean> => {
  const user = await prisma.user.count({
    where: { username: username },
  });
  return user > 0;
};

export const getUserChatGroupIds = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groupMemberships: {
        include: {
          group: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  return user?.groupMemberships?.map((membership) => membership.group.id) || [];
};

export const isUserOnline = async (userId: number): Promise<boolean> => {
  const cacheKey = `user_${userId}/online_status`;

  const onlineStatus = await fetchFromCacheOrDb(cacheKey, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isOnline: true },
    });

    return user ? user.isOnline : false;
  });

  return onlineStatus;
};

export const updateUserOnline = async (userId: number): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: true,
    },
  });

  const cacheKey = `user_${userId}/online_status`;

  await redis.set(cacheKey, JSON.stringify(true), 'EX', 3600);
};

export const updateUserOffline = async (userId: number): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: false,
      lastSeenAt: new Date(),
    },
  });

  const cacheKey = `user_${userId}/online_status`;

  await redis.set(cacheKey, JSON.stringify(false), 'EX', 3600);
};
