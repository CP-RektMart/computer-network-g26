/*
  Warnings:

  - The primary key for the `DirectMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `DirectMessage` table. All the data in the column will be lost.
  - The primary key for the `GroupMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `GroupMessage` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DirectMessage_senderId_receiverId_idx";

-- DropIndex
DROP INDEX "GroupMessage_groupId_idx";

-- AlterTable
ALTER TABLE "DirectMessage" DROP CONSTRAINT "DirectMessage_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("senderId", "receiverId", "sentAt");

-- AlterTable
ALTER TABLE "GroupMessage" DROP CONSTRAINT "GroupMessage_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("userId", "groupId", "sentAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_receiverId_sentAt_idx" ON "DirectMessage"("senderId", "receiverId", "sentAt");

-- CreateIndex
CREATE INDEX "GroupMessage_userId_groupId_sentAt_idx" ON "GroupMessage"("userId", "groupId", "sentAt");
