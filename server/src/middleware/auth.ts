import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import { JWT_SECRET } from '@/env';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';

declare global {
  namespace Express {
    interface Request {
      user?: number;
    }
  }
}

export const validateRegisterUser = [
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  },
];

export const protect = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    req.user = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
