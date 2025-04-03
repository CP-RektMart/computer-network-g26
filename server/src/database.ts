import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Database connection
const connectToDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error connecting to the database:', error.message);
    } else {
      console.error('❌ Error connecting to the database:', error);
    }
    process.exit(1);
  }
};

export { prisma, connectToDatabase };
