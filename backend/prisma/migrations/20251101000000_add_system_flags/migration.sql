-- AlterTable roles
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "system" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable permissions
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "system" BOOLEAN NOT NULL DEFAULT false;

-- Mark known default roles as system if they exist
UPDATE "roles" SET "system" = true WHERE name IN ('admin', 'regular');

-- Mark standard permissions as system if they exist
UPDATE "permissions" SET "system" = true WHERE ("resource","action") IN (
  ('users','view'),('users','create'),('users','update'),('users','delete'),('users','manage'),
  ('roles','view'),('roles','create'),('roles','update'),('roles','delete'),('roles','manage'),
  ('permissions','view'),('permissions','create'),('permissions','update'),('permissions','delete'),('permissions','manage'),
  ('credentials','view'),('credentials','create'),('credentials','update'),('credentials','delete'),('credentials','manage'),
  ('servers','view'),('servers','create'),('servers','update'),('servers','delete'),('servers','manage'),
  ('services','view'),('services','create'),('services','update'),('services','delete'),('services','manage'),
  ('groups','view'),('groups','create'),('groups','update'),('groups','delete'),('groups','manage'),
  ('tags','view'),('tags','create'),('tags','update'),('tags','delete'),('tags','manage'),
  ('release-notes','view'),('release-notes','create'),('release-notes','update'),('release-notes','delete'),('release-notes','manage'),
  ('dashboard','view'),('dashboard','create'),('dashboard','update'),('dashboard','delete'),('dashboard','manage'),
  ('profile','view'),('profile','create'),('profile','update'),('profile','delete'),('profile','manage')
);
