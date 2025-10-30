-- AlterTable
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "resource" TEXT;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Update existing permissions - extract resource and action from name
-- Assuming existing permissions are in format "resource:action" or just "name"
UPDATE "permissions" 
SET 
  "resource" = CASE 
    WHEN "name" LIKE '%:%' THEN SPLIT_PART("name", ':', 1)
    ELSE 'general'
  END,
  "action" = CASE 
    WHEN "name" LIKE '%:%' THEN SPLIT_PART("name", ':', 2)
    ELSE 'view'
  END
WHERE "resource" IS NULL OR "action" IS NULL;

-- Make resource and action required
ALTER TABLE "permissions" ALTER COLUMN "resource" SET NOT NULL;
ALTER TABLE "permissions" ALTER COLUMN "action" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_resource_action_key" ON "permissions"("resource", "action");

