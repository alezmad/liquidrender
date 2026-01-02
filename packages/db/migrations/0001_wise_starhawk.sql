CREATE TABLE "knosia_user_vocabulary_prefs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"favorites" jsonb DEFAULT '[]'::jsonb,
	"synonyms" jsonb DEFAULT '{}'::jsonb,
	"recently_used" jsonb DEFAULT '[]'::jsonb,
	"dismissed_suggestions" jsonb DEFAULT '[]'::jsonb,
	"private_vocabulary" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "knosia_vocabulary_item" ADD COLUMN "suggested_for_roles" jsonb;--> statement-breakpoint
ALTER TABLE "knosia_user_vocabulary_prefs" ADD CONSTRAINT "knosia_user_vocabulary_prefs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_user_vocabulary_prefs" ADD CONSTRAINT "knosia_user_vocabulary_prefs_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_vocab_prefs" ON "knosia_user_vocabulary_prefs" USING btree ("user_id","workspace_id");