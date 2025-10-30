-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "public"."users"("username") WHERE "username" IS NOT NULL;
