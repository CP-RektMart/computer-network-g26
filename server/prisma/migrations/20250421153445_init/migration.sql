-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "havePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "salt" TEXT NOT NULL DEFAULT '';
