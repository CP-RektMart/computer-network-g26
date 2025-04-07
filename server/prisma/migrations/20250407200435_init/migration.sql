/*
  Warnings:

  - The primary key for the `GroupMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "GroupMessage" DROP CONSTRAINT "GroupMessage_pkey",
ADD CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id", "sentAt");
