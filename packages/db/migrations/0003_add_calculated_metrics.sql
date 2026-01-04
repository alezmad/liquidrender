-- Add calculated metrics table
CREATE TABLE "knosia_calculated_metric" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "connection_id" text NOT NULL,
  "name" text NOT NULL,
  "category" text,
  "description" text,
  "semantic_definition" jsonb NOT NULL,
  "confidence" numeric(3, 2),
  "feasible" boolean DEFAULT true NOT NULL,
  "source" text DEFAULT 'ai_generated' NOT NULL,
  "vocabulary_item_ids" text[],
  "canvas_count" integer DEFAULT 0 NOT NULL,
  "execution_count" integer DEFAULT 0 NOT NULL,
  "last_executed_at" timestamp with time zone,
  "last_execution_result" jsonb,
  "status" text DEFAULT 'active' NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "knosia_calculated_metric" ADD CONSTRAINT "knosia_calculated_metric_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_calculated_metric" ADD CONSTRAINT "knosia_calculated_metric_connection_id_knosia_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "knosia_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_calculated_metric" ADD CONSTRAINT "knosia_calculated_metric_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Indexes
CREATE INDEX "idx_calculated_metric_workspace" ON "knosia_calculated_metric" ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_calculated_metric_connection" ON "knosia_calculated_metric" ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_calculated_metric_status" ON "knosia_calculated_metric" ("status");--> statement-breakpoint
CREATE INDEX "idx_calculated_metric_category" ON "knosia_calculated_metric" ("category");--> statement-breakpoint

-- JSONB index for entity queries
CREATE INDEX "idx_calculated_metric_semantic_entity" ON "knosia_calculated_metric" USING gin ((semantic_definition -> 'entity'));--> statement-breakpoint

-- Add columns to analysis table
ALTER TABLE "knosia_analysis" ADD COLUMN "calculated_metrics_generated" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "knosia_analysis" ADD COLUMN "calculated_metrics_feasible" integer DEFAULT 0;
