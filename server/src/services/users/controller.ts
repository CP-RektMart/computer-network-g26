import * as express from 'express';
import { prisma } from '@/database';
import { User } from '@prisma/client';

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

export const getUserById = async (userId: number): Promise<User | null> => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
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
