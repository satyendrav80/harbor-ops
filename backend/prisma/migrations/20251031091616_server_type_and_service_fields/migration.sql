/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServerType') THEN
    CREATE TYPE "public"."ServerType" AS ENUM ('os', 'rds', 'amplify', 'lambda', 'ec2', 'ecs', 'other');
  END IF;
END$$;

-- AlterTable
ALTER TABLE "public"."servers" ADD COLUMN IF NOT EXISTS "type" "public"."ServerType" NOT NULL DEFAULT 'os';

-- AlterTable
ALTER TABLE "public"."services" ADD COLUMN  IF NOT EXISTS "app_id" TEXT,
ADD COLUMN IF NOT EXISTS "deployment_url" TEXT,
ADD COLUMN IF NOT EXISTS "function_name" TEXT,
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "source_repo" TEXT;


-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "public"."users"("username");
