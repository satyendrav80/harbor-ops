-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "service_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
