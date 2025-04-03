import * as express from 'express';
import { prisma } from '@/database';

export const registerUser = async (req: express.Request, res: express.Response): Promise<void> => {
  const { email, password }: { email: string; password: string } = req.body;
  const username: string = req.body.username.toLowerCase();

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    res.status(400).json({ error: 'Username already exists' });
    return;
  }

  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    res.status(400).json({ error: 'Email already exists' });
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password, // Use hashedPassword if you hash the password
    },
  });

  res.status(201).json(user);
};

export const getUserById = async (req: express.Request, res: express.Response): Promise<void> => {
  const userId: number = parseInt(req.params.id, 10);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      messages: true,
      directMessagesSent: true,
      directMessagesReceived: true,
      groupMemberships: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json(user);
};

export const getUserByUsername = async (req: express.Request, res: express.Response): Promise<void> => {
  const username: string = req.params.username.toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
    include: {
      messages: true,
      directMessagesSent: true,
      directMessagesReceived: true,
      groupMemberships: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json(user);
};
