/*
  Warnings:

  - You are about to drop the column `lastSeenAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastSeenAt",
ADD COLUMN     "lastLogin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
