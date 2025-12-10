-- Add attention_to_id to tasks to track who should pay attention when blocked/reviewed
ALTER TABLE "tasks"
ADD COLUMN "attention_to_id" TEXT NULL;

ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_attention_to_id_fkey"
FOREIGN KEY ("attention_to_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tasks_attention_to_id_idx" ON "tasks"("attention_to_id");

