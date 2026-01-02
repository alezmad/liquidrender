CREATE TABLE "knosia_table_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"table_name" text NOT NULL,
	"profile" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_column_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"table_profile_id" text NOT NULL,
	"column_name" text NOT NULL,
	"profile" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knosia_table_profile" ADD CONSTRAINT "knosia_table_profile_analysis_id_knosia_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."knosia_analysis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_column_profile" ADD CONSTRAINT "knosia_column_profile_table_profile_id_knosia_table_profile_id_fk" FOREIGN KEY ("table_profile_id") REFERENCES "public"."knosia_table_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knosia_table_profile_analysis_table_idx" ON "knosia_table_profile" USING btree ("analysis_id","table_name");--> statement-breakpoint
CREATE UNIQUE INDEX "knosia_column_profile_table_column_idx" ON "knosia_column_profile" USING btree ("table_profile_id","column_name");