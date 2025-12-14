-- AlterTable
ALTER TABLE "public"."filter_presets" ADD COLUMN     "order_by" JSONB,
ADD COLUMN     "group_by" JSONB;

