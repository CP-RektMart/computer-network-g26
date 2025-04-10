import * as express from 'express';
import { prisma } from '@/database';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '@/env';
import jwt from 'jsonwebtoken';

interface UserRegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface TokenResponseUser {
  id: number;
  username: string;
  email: string;
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

export const loginUser = async (username: string, password: string): Promise<User | null> => {
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

const getSignedJwtToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const getTokenResponse = (user: User, statusCode: number, res: express.Response): void => {
  const token: string = getSignedJwtToken(user.id);

  const options = {
    expires: new Date(Date.now() + 30 * (24 * 60 * 60 * 1000)),
    httpOnly: true,
  };

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
  });
};
