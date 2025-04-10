import jwt from 'jsonwebtoken';
import * as express from 'express';
import { isUserExistById } from './services/users/utils';

interface JwtPayload {
  userId: number;
}

export async function AuthenticateJWT(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization header missing or invalid' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const userId = decoded.userId;
    if (!userId) {
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }

    const exist = await isUserExistById(userId);
    if (!exist) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    (req as any).userId = userId;

    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
}
