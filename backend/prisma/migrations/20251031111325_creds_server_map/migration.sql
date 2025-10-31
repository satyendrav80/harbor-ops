-- AlterTable
ALTER TABLE "public"."servers" ADD COLUMN     "credential_id" INTEGER,
ADD COLUMN     "port" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."servers" ADD CONSTRAINT "servers_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
