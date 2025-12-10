-- Drop index defensively (may not exist on fresh databases)
DROP INDEX IF EXISTS "public"."tasks_attention_to_id_idx";
