/*
  Warnings:

  - The primary key for the `DirectMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GroupMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GroupMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `content` on the `DirectMessage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `content` on the `GroupMessage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "DirectMessage_senderId_receiverId_sentAt_idx";

-- DropIndex
DROP INDEX "GroupMessage_userId_groupId_sentAt_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_username_idx";

-- AlterTable
ALTER TABLE "DirectMessage" DROP CONSTRAINT "DirectMessage_pkey",
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL,
ADD CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("senderId", "sentAt", "receiverId");

-- AlterTable
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_pkey",
ADD CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("groupId", "userId");

-- AlterTable
ALTER TABLE "GroupMessage" DROP CONSTRAINT "GroupMessage_pkey",
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL,
ADD CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("groupId", "sentAt", "userId");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_sentAt_receiverId_idx" ON "DirectMessage"("senderId", "sentAt", "receiverId");

-- CreateIndex
CREATE INDEX "Group_id_name_idx" ON "Group"("id", "name");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_userId_idx" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupMessage_groupId_sentAt_userId_idx" ON "GroupMessage"("groupId", "sentAt", "userId");

-- CreateIndex
CREATE INDEX "User_id_username_email_idx" ON "User"("id", "username", "email");
