/*
  Warnings:

  - You are about to drop the column `credential_id` on the `servers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."servers" DROP CONSTRAINT "servers_credential_id_fkey";

-- AlterTable
ALTER TABLE "public"."servers" DROP COLUMN "credential_id";

-- CreateTable
CREATE TABLE "public"."server_credentials" (
    "server_id" INTEGER NOT NULL,
    "credential_id" INTEGER NOT NULL,

    CONSTRAINT "server_credentials_pkey" PRIMARY KEY ("server_id","credential_id")
);

-- AddForeignKey
ALTER TABLE "public"."server_credentials" ADD CONSTRAINT "server_credentials_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_credentials" ADD CONSTRAINT "server_credentials_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
