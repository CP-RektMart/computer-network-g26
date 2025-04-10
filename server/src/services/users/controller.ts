import { prisma } from '@/database';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

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

//@desc    Get User by ID
//@route   GET /api/users/:id
//@access  Public
export const getUserById = async (userId: number): Promise<User | null> => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
};

//@desc    Get User by Username
//@route   GET /api/users/username/:username
//@access  Public
export const getUserByUsername = async (username: string): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  return user;
};
