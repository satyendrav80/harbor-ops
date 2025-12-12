-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "release_note_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_release_note_id_fkey" FOREIGN KEY ("release_note_id") REFERENCES "public"."release_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
