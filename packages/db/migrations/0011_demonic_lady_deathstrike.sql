ALTER TABLE "customer" ADD COLUMN "credits" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "knosia_organization" ADD COLUMN "is_guest" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "knosia_organization" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "knosia_workspace" ADD COLUMN "compiled_vocabulary" jsonb;--> statement-breakpoint
ALTER TABLE "knosia_workspace" ADD COLUMN "vocabulary_version" integer DEFAULT 1;