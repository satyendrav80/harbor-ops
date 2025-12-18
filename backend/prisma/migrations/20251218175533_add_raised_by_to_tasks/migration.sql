-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN "raised_by" TEXT;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "tasks_raised_by_idx" ON "public"."tasks"("raised_by");

