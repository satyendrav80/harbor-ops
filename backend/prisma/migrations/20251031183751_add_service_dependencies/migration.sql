-- CreateTable
CREATE TABLE "public"."service_dependencies" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "dependency_service_id" INTEGER,
    "external_service_name" TEXT,
    "external_service_type" TEXT,
    "external_service_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_dependencies_service_id_idx" ON "public"."service_dependencies"("service_id");

-- CreateIndex
CREATE INDEX "service_dependencies_dependency_service_id_idx" ON "public"."service_dependencies"("dependency_service_id");

-- AddForeignKey
ALTER TABLE "public"."service_dependencies" ADD CONSTRAINT "service_dependencies_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_dependencies" ADD CONSTRAINT "service_dependencies_dependency_service_id_fkey" FOREIGN KEY ("dependency_service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
