/*
  Warnings:

  - You are about to drop the column `lastSeemAt` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "lastSeemAt",
ADD COLUMN     "lastSendAt" TIMESTAMP(3);
