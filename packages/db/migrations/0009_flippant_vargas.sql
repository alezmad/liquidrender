CREATE TYPE "public"."database_type" AS ENUM('postgres', 'mysql', 'sqlite', 'duckdb');--> statement-breakpoint
CREATE TYPE "public"."vocabulary_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "vocabulary" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "vocabulary_status" DEFAULT 'draft' NOT NULL,
	"database_type" "database_type" NOT NULL,
	"connection_name" text NOT NULL,
	"schema_name" text DEFAULT 'public' NOT NULL,
	"schema_info" jsonb,
	"vocabulary" jsonb,
	"confirmation_answers" jsonb,
	"entity_count" integer DEFAULT 0 NOT NULL,
	"metric_count" integer DEFAULT 0 NOT NULL,
	"dimension_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;