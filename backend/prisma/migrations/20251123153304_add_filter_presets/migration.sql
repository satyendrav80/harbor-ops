-- CreateTable
CREATE TABLE "public"."filter_presets" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filter_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "filter_presets_user_id_page_id_idx" ON "public"."filter_presets"("user_id", "page_id");

-- CreateIndex
CREATE INDEX "filter_presets_user_id_idx" ON "public"."filter_presets"("user_id");

-- CreateIndex
CREATE INDEX "filter_presets_page_id_is_shared_idx" ON "public"."filter_presets"("page_id", "is_shared");

-- AddForeignKey
ALTER TABLE "public"."filter_presets" ADD CONSTRAINT "filter_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
