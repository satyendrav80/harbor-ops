-- CreateEnum
CREATE TYPE "public"."ServerType" AS ENUM ('os', 'rds', 'amplify', 'lambda', 'ec2', 'ecs', 'other');

-- CreateEnum
CREATE TYPE "public"."GroupItemType" AS ENUM ('server', 'service');

-- CreateEnum
CREATE TYPE "public"."ReleaseStatus" AS ENUM ('pending', 'deployment_started', 'deployed');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('pending', 'approved', 'blocked');

-- CreateEnum
CREATE TYPE "public"."MetaResourceType" AS ENUM ('credential', 'server', 'service', 'user', 'group', 'tag', 'domain');

-- CreateEnum
CREATE TYPE "public"."MetaValueType" AS ENUM ('string', 'number', 'boolean', 'json');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "public"."credentials" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."server_credentials" (
    "server_id" INTEGER NOT NULL,
    "credential_id" INTEGER NOT NULL,

    CONSTRAINT "server_credentials_pkey" PRIMARY KEY ("server_id","credential_id")
);

-- CreateTable
CREATE TABLE "public"."servers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ServerType" NOT NULL DEFAULT 'os',
    "public_ip" TEXT,
    "private_ip" TEXT,
    "endpoint" TEXT,
    "port" INTEGER,
    "ssh_port" INTEGER,
    "username" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."services" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "external" BOOLEAN NOT NULL DEFAULT false,
    "source_repo" TEXT,
    "app_id" TEXT,
    "function_name" TEXT,
    "deployment_url" TEXT,
    "documentation_url" TEXT,
    "documentation" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_items" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "item_type" "public"."GroupItemType" NOT NULL,
    "item_id" INTEGER NOT NULL,

    CONSTRAINT "group_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_tags" (
    "service_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "service_tags_pkey" PRIMARY KEY ("service_id","tag_id")
);

-- CreateTable
CREATE TABLE "public"."server_tags" (
    "server_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "server_tags_pkey" PRIMARY KEY ("server_id","tag_id")
);

-- CreateTable
CREATE TABLE "public"."release_notes" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "status" "public"."ReleaseStatus" NOT NULL DEFAULT 'pending',
    "publish_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "release_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."domains" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_credentials" (
    "service_id" INTEGER NOT NULL,
    "credential_id" INTEGER NOT NULL,

    CONSTRAINT "service_credentials_pkey" PRIMARY KEY ("service_id","credential_id")
);

-- CreateTable
CREATE TABLE "public"."server_domains" (
    "server_id" INTEGER NOT NULL,
    "domain_id" INTEGER NOT NULL,

    CONSTRAINT "server_domains_pkey" PRIMARY KEY ("server_id","domain_id")
);

-- CreateTable
CREATE TABLE "public"."service_domains" (
    "service_id" INTEGER NOT NULL,
    "domain_id" INTEGER NOT NULL,

    CONSTRAINT "service_domains_pkey" PRIMARY KEY ("service_id","domain_id")
);

-- CreateTable
CREATE TABLE "public"."service_servers" (
    "service_id" INTEGER NOT NULL,
    "server_id" INTEGER NOT NULL,

    CONSTRAINT "service_servers_pkey" PRIMARY KEY ("service_id","server_id")
);

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
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "service_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."meta" (
    "id" SERIAL NOT NULL,
    "resource_type" "public"."MetaResourceType" NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_type" "public"."MetaValueType" NOT NULL DEFAULT 'string',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "public"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "public"."permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "public"."groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_value_key" ON "public"."tags"("name", "value");

-- CreateIndex
CREATE UNIQUE INDEX "domains_name_key" ON "public"."domains"("name");

-- CreateIndex
CREATE INDEX "service_dependencies_service_id_idx" ON "public"."service_dependencies"("service_id");

-- CreateIndex
CREATE INDEX "service_dependencies_dependency_service_id_idx" ON "public"."service_dependencies"("dependency_service_id");

-- CreateIndex
CREATE INDEX "meta_resource_type_resource_id_idx" ON "public"."meta"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "meta_resource_type_resource_id_key_key" ON "public"."meta"("resource_type", "resource_id", "key");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credentials" ADD CONSTRAINT "credentials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credentials" ADD CONSTRAINT "credentials_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_credentials" ADD CONSTRAINT "server_credentials_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_credentials" ADD CONSTRAINT "server_credentials_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servers" ADD CONSTRAINT "servers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servers" ADD CONSTRAINT "servers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_items" ADD CONSTRAINT "group_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_tags" ADD CONSTRAINT "service_tags_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_tags" ADD CONSTRAINT "service_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_tags" ADD CONSTRAINT "server_tags_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_tags" ADD CONSTRAINT "server_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_notes" ADD CONSTRAINT "release_notes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_notes" ADD CONSTRAINT "release_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_notes" ADD CONSTRAINT "release_notes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."domains" ADD CONSTRAINT "domains_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."domains" ADD CONSTRAINT "domains_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_credentials" ADD CONSTRAINT "service_credentials_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_credentials" ADD CONSTRAINT "service_credentials_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_domains" ADD CONSTRAINT "server_domains_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_domains" ADD CONSTRAINT "server_domains_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_domains" ADD CONSTRAINT "service_domains_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_domains" ADD CONSTRAINT "service_domains_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_servers" ADD CONSTRAINT "service_servers_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_servers" ADD CONSTRAINT "service_servers_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_dependencies" ADD CONSTRAINT "service_dependencies_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_dependencies" ADD CONSTRAINT "service_dependencies_dependency_service_id_fkey" FOREIGN KEY ("dependency_service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_dependencies" ADD CONSTRAINT "service_dependencies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_dependencies" ADD CONSTRAINT "service_dependencies_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meta" ADD CONSTRAINT "meta_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meta" ADD CONSTRAINT "meta_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
