/*
  Warnings:

  - You are about to drop the column `joinAt` on the `GroupMember` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupMember" DROP COLUMN "joinAt",
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
