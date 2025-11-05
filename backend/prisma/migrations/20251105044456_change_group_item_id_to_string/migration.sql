-- AlterTable
-- Convert INTEGER to TEXT for item_id to support both numeric IDs and user CUIDs
ALTER TABLE "public"."group_items" ALTER COLUMN "item_id" TYPE TEXT USING "item_id"::TEXT;
