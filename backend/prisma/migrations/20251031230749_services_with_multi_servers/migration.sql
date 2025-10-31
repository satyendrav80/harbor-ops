/*
  Warnings:

  - You are about to drop the column `server_id` on the `services` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."services" DROP CONSTRAINT "services_server_id_fkey";

-- AlterTable
ALTER TABLE "public"."services" DROP COLUMN "server_id";

-- AlterTable
ALTER TABLE "public"."tags" ADD COLUMN     "color" TEXT;

-- CreateTable
CREATE TABLE "public"."service_servers" (
    "service_id" INTEGER NOT NULL,
    "server_id" INTEGER NOT NULL,

    CONSTRAINT "service_servers_pkey" PRIMARY KEY ("service_id","server_id")
);

-- AddForeignKey
ALTER TABLE "public"."service_servers" ADD CONSTRAINT "service_servers_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_servers" ADD CONSTRAINT "service_servers_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
