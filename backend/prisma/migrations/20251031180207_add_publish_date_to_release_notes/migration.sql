-- AlterTable
ALTER TABLE "public"."release_notes" ADD COLUMN     "publish_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
