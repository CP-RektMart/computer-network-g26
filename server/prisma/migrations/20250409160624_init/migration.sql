/*
  Warnings:

  - The primary key for the `GroupMember` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "GroupMember_groupId_userId_idx";

-- AlterTable
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_pkey",
ADD CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("userId", "groupId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_groupId_idx" ON "GroupMember"("userId", "groupId");
