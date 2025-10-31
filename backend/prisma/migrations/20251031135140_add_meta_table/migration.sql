/*
  Warnings:

  - You are about to drop the column `data` on the `credentials` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."MetaResourceType" AS ENUM ('credential', 'server', 'service', 'user', 'group', 'tag', 'domain');

-- CreateEnum
CREATE TYPE "public"."MetaValueType" AS ENUM ('string', 'number', 'boolean', 'json');

-- AlterTable
ALTER TABLE "public"."credentials" DROP COLUMN "data";

-- CreateTable
CREATE TABLE "public"."meta" (
    "id" SERIAL NOT NULL,
    "resource_type" "public"."MetaResourceType" NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_type" "public"."MetaValueType" NOT NULL DEFAULT 'string',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meta_resource_type_resource_id_idx" ON "public"."meta"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "meta_resource_type_resource_id_key_key" ON "public"."meta"("resource_type", "resource_id", "key");
