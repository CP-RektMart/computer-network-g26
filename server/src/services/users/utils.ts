import * as express from 'express';
import { JWT_SECRET } from '@/env';
import jwt from 'jsonwebtoken';
import { UserDto } from './type';

export const getSignedJwtToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const getTokenResponse = (user: UserDto, statusCode: number, res: express.Response): void => {
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
