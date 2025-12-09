-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('pending', 'in_progress', 'in_review', 'testing', 'completed', 'paused', 'blocked', 'cancelled', 'reopened');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "public"."TaskType" AS ENUM ('bug', 'feature', 'todo', 'epic', 'improvement');

-- CreateEnum
CREATE TYPE "public"."SprintStatus" AS ENUM ('planned', 'active', 'completed', 'cancelled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AuditResourceType" ADD VALUE 'task';
ALTER TYPE "public"."AuditResourceType" ADD VALUE 'sprint';
ALTER TYPE "public"."AuditResourceType" ADD VALUE 'task_comment';

-- CreateTable
CREATE TABLE "public"."sprints" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."SprintStatus" NOT NULL DEFAULT 'planned',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."TaskType" NOT NULL DEFAULT 'todo',
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'pending',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'medium',
    "sprint_id" INTEGER,
    "created_by" TEXT,
    "assigned_to" TEXT,
    "assigned_at" TIMESTAMP(3),
    "tester_id" TEXT,
    "tester_assigned_at" TIMESTAMP(3),
    "testing_skipped" BOOLEAN NOT NULL DEFAULT false,
    "testing_skip_reason" TEXT,
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "reopen_count" INTEGER NOT NULL DEFAULT 0,
    "last_reopened_at" TIMESTAMP(3),
    "last_reopened_by" TEXT,
    "estimated_hours" DOUBLE PRECISION,
    "actual_hours" DOUBLE PRECISION,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "parent_task_id" INTEGER,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_comments" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_comment_reactions" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_tags" (
    "task_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "task_tags_pkey" PRIMARY KEY ("task_id","tag_id")
);

-- CreateTable
CREATE TABLE "public"."task_sprint_history" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "sprint_id" INTEGER,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moved_by" TEXT,
    "reason" TEXT,

    CONSTRAINT "task_sprint_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_dependencies" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "blocked_by_task_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."release_note_tasks" (
    "id" SERIAL NOT NULL,
    "release_note_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_note_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sprints_deleted_idx" ON "public"."sprints"("deleted");

-- CreateIndex
CREATE INDEX "sprints_status_idx" ON "public"."sprints"("status");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "public"."tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_idx" ON "public"."tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "tasks_tester_id_idx" ON "public"."tasks"("tester_id");

-- CreateIndex
CREATE INDEX "tasks_sprint_id_idx" ON "public"."tasks"("sprint_id");

-- CreateIndex
CREATE INDEX "tasks_deleted_idx" ON "public"."tasks"("deleted");

-- CreateIndex
CREATE INDEX "tasks_created_by_idx" ON "public"."tasks"("created_by");

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "public"."tasks"("parent_task_id");

-- CreateIndex
CREATE INDEX "task_comments_task_id_idx" ON "public"."task_comments"("task_id");

-- CreateIndex
CREATE INDEX "task_comments_parent_id_idx" ON "public"."task_comments"("parent_id");

-- CreateIndex
CREATE INDEX "task_comments_created_by_idx" ON "public"."task_comments"("created_by");

-- CreateIndex
CREATE INDEX "task_comments_deleted_idx" ON "public"."task_comments"("deleted");

-- CreateIndex
CREATE INDEX "task_comment_reactions_comment_id_idx" ON "public"."task_comment_reactions"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_comment_reactions_comment_id_user_id_emoji_key" ON "public"."task_comment_reactions"("comment_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "task_sprint_history_task_id_idx" ON "public"."task_sprint_history"("task_id");

-- CreateIndex
CREATE INDEX "task_sprint_history_sprint_id_idx" ON "public"."task_sprint_history"("sprint_id");

-- CreateIndex
CREATE INDEX "task_dependencies_task_id_idx" ON "public"."task_dependencies"("task_id");

-- CreateIndex
CREATE INDEX "task_dependencies_blocked_by_task_id_idx" ON "public"."task_dependencies"("blocked_by_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_task_id_blocked_by_task_id_key" ON "public"."task_dependencies"("task_id", "blocked_by_task_id");

-- CreateIndex
CREATE INDEX "release_note_tasks_release_note_id_idx" ON "public"."release_note_tasks"("release_note_id");

-- CreateIndex
CREATE INDEX "release_note_tasks_task_id_idx" ON "public"."release_note_tasks"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "release_note_tasks_release_note_id_task_id_key" ON "public"."release_note_tasks"("release_note_id", "task_id");

-- AddForeignKey
ALTER TABLE "public"."sprints" ADD CONSTRAINT "sprints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sprints" ADD CONSTRAINT "sprints_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sprints" ADD CONSTRAINT "sprints_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_tester_id_fkey" FOREIGN KEY ("tester_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_last_reopened_by_fkey" FOREIGN KEY ("last_reopened_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comments" ADD CONSTRAINT "task_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comments" ADD CONSTRAINT "task_comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comment_reactions" ADD CONSTRAINT "task_comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comment_reactions" ADD CONSTRAINT "task_comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_tags" ADD CONSTRAINT "task_tags_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_tags" ADD CONSTRAINT "task_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_sprint_history" ADD CONSTRAINT "task_sprint_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_sprint_history" ADD CONSTRAINT "task_sprint_history_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_sprint_history" ADD CONSTRAINT "task_sprint_history_moved_by_fkey" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_blocked_by_task_id_fkey" FOREIGN KEY ("blocked_by_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_note_tasks" ADD CONSTRAINT "release_note_tasks_release_note_id_fkey" FOREIGN KEY ("release_note_id") REFERENCES "public"."release_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_note_tasks" ADD CONSTRAINT "release_note_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
