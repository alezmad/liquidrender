-- Canvas API Migration
-- Replaces old canvas schema (knosiaCanvas, knosiaCanvasAlert, knosiaCanvasBlock)
-- with new multi-canvas schema (knosiaWorkspaceCanvas, knosiaCanvasVersion)

-- Drop old canvas tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS "knosia_canvas_alert" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "knosia_canvas_block" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "knosia_canvas" CASCADE;--> statement-breakpoint

-- Drop old canvas enums
DROP TYPE IF EXISTS "public"."knosia_canvas_block_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."knosia_canvas_status";--> statement-breakpoint

-- Create new canvas scope enum
CREATE TYPE "public"."knosia_canvas_scope" AS ENUM('private', 'workspace');--> statement-breakpoint

-- Create new workspace canvas table
CREATE TABLE "knosia_workspace_canvas" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"schema" jsonb NOT NULL,
	"owner_id" text NOT NULL,
	"scope" "knosia_canvas_scope" NOT NULL,
	"is_default" boolean DEFAULT false,
	"current_version" integer DEFAULT 1,
	"last_edited_by" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);--> statement-breakpoint

-- Create canvas version history table
CREATE TABLE "knosia_canvas_version" (
	"id" text PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"schema" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"change_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add foreign key constraints for workspace canvas
ALTER TABLE "knosia_workspace_canvas" ADD CONSTRAINT "knosia_workspace_canvas_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace_canvas" ADD CONSTRAINT "knosia_workspace_canvas_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace_canvas" ADD CONSTRAINT "knosia_workspace_canvas_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Add foreign key constraints for canvas version
ALTER TABLE "knosia_canvas_version" ADD CONSTRAINT "knosia_canvas_version_canvas_id_knosia_workspace_canvas_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."knosia_workspace_canvas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_canvas_version" ADD CONSTRAINT "knosia_canvas_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Create unique index for default workspace canvas (only one default per workspace)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_default_workspace_canvas" ON "knosia_workspace_canvas" USING btree ("workspace_id") WHERE ("is_default" = true);--> statement-breakpoint

-- Create unique index for canvas versions (one version number per canvas)
CREATE UNIQUE INDEX IF NOT EXISTS "unique_canvas_version" ON "knosia_canvas_version" USING btree ("canvas_id","version_number");
