import { JWT_SECRET } from '@/env';
import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const getSignedJwtToken = (user: User): string => {
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: '30d',
  });
  return token;
};
