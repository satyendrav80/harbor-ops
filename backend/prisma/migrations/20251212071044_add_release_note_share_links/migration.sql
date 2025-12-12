-- CreateTable
CREATE TABLE "public"."release_note_share_links" (
    "id" TEXT NOT NULL,
    "share_token" TEXT NOT NULL,
    "filters" JSONB,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMP(3),

    CONSTRAINT "release_note_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "release_note_share_links_share_token_key" ON "public"."release_note_share_links"("share_token");

-- CreateIndex
CREATE INDEX "release_note_share_links_share_token_idx" ON "public"."release_note_share_links"("share_token");

-- CreateIndex
CREATE INDEX "release_note_share_links_created_by_idx" ON "public"."release_note_share_links"("created_by");

-- CreateIndex
CREATE INDEX "release_note_share_links_expires_at_idx" ON "public"."release_note_share_links"("expires_at");

-- AddForeignKey
ALTER TABLE "public"."release_note_share_links" ADD CONSTRAINT "release_note_share_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
