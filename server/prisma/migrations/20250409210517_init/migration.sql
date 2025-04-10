/*
  Warnings:

  - You are about to drop the column `is_online` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `last_seem_at` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "is_online",
DROP COLUMN "last_seem_at",
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
