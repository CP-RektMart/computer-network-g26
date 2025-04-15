/*
  Warnings:

  - You are about to drop the column `lastSendAt` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "lastSendAt",
ADD COLUMN     "lastSeemAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RoomParticipant" ALTER COLUMN "lastSeemAt" DROP NOT NULL,
ALTER COLUMN "lastSeemAt" DROP DEFAULT;
