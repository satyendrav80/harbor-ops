-- Add deployed_at column to release_notes
ALTER TABLE "public"."release_notes"
ADD COLUMN "deployed_at" TIMESTAMP(3);
