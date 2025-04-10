import { User } from '@prisma/client';
import * as express from 'express';
import { JWT_SECRET } from '@/env';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
