import * as express from 'express';
import { prisma } from '@/database';
import { User } from '@prisma/client';
import { fetchFromCacheOrDb, redis } from '@/redis';

interface UserRegisterRequest {
  username: string;
  email: string;
  password: string;
}

export const registerUser = async ({ username, email, password }: UserRegisterRequest): Promise<User> => {
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

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password, // Hash it in production!
      salt: 'salt', // Hash it in production!
    },
  });

  return user;
};

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
    chat,
  };
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  return user;
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
