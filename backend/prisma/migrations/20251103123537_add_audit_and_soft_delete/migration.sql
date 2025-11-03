-- CreateEnum
CREATE TYPE "public"."AuditResourceType" AS ENUM ('user', 'server', 'service', 'credential', 'tag', 'domain', 'group', 'role', 'permission');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('create', 'update', 'delete', 'restore');

-- AlterTable
ALTER TABLE "public"."credentials" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "public"."domains" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "public"."groups" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "public"."permissions" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."roles" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."servers" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "public"."services" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "public"."tags" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- CreateTable
CREATE TABLE "public"."audits" (
    "id" SERIAL NOT NULL,
    "resource_type" "public"."AuditResourceType" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "user_id" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audits_resource_type_resource_id_idx" ON "public"."audits"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audits_user_id_idx" ON "public"."audits"("user_id");

-- CreateIndex
CREATE INDEX "audits_created_at_idx" ON "public"."audits"("created_at");

-- CreateIndex
CREATE INDEX "credentials_deleted_idx" ON "public"."credentials"("deleted");

-- CreateIndex
CREATE INDEX "domains_deleted_idx" ON "public"."domains"("deleted");

-- CreateIndex
CREATE INDEX "groups_deleted_idx" ON "public"."groups"("deleted");

-- CreateIndex
CREATE INDEX "servers_deleted_idx" ON "public"."servers"("deleted");

-- CreateIndex
CREATE INDEX "services_deleted_idx" ON "public"."services"("deleted");

-- CreateIndex
CREATE INDEX "tags_deleted_idx" ON "public"."tags"("deleted");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credentials" ADD CONSTRAINT "credentials_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servers" ADD CONSTRAINT "servers_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."domains" ADD CONSTRAINT "domains_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audits" ADD CONSTRAINT "audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
