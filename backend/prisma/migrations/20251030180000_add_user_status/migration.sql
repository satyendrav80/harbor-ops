-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'approved', 'blocked');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'pending';

-- Update existing users to approved status
UPDATE "users" SET "status" = 'approved' WHERE "status" = 'pending';

