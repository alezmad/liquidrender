CREATE TYPE "public"."knosia_aggregation" AS ENUM('SUM', 'AVG', 'COUNT', 'MIN', 'MAX');--> statement-breakpoint
CREATE TYPE "public"."knosia_analysis_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."knosia_connection_status" AS ENUM('connected', 'error', 'stale');--> statement-breakpoint
CREATE TYPE "public"."knosia_connection_type" AS ENUM('postgres', 'mysql', 'snowflake', 'bigquery', 'redshift', 'duckdb');--> statement-breakpoint
CREATE TYPE "public"."knosia_conversation_status" AS ENUM('active', 'archived', 'shared');--> statement-breakpoint
CREATE TYPE "public"."knosia_membership_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."knosia_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."knosia_mismatch_issue" AS ENUM('wrong_mapping', 'wrong_name', 'missing', 'other');--> statement-breakpoint
CREATE TYPE "public"."knosia_mismatch_status" AS ENUM('pending', 'reviewed', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."knosia_role_archetype" AS ENUM('strategist', 'operator', 'analyst', 'builder');--> statement-breakpoint
CREATE TYPE "public"."knosia_seniority" AS ENUM('executive', 'director', 'manager', 'ic');--> statement-breakpoint
CREATE TYPE "public"."knosia_vocabulary_status" AS ENUM('approved', 'draft', 'deprecated', 'archived');--> statement-breakpoint
CREATE TYPE "public"."knosia_vocabulary_type" AS ENUM('metric', 'dimension', 'entity', 'event');--> statement-breakpoint
CREATE TYPE "public"."knosia_workspace_visibility" AS ENUM('org_wide', 'team_only', 'private');--> statement-breakpoint
CREATE TABLE "knosia_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"workspace_id" text,
	"status" "knosia_analysis_status" DEFAULT 'running' NOT NULL,
	"current_step" integer DEFAULT 0,
	"total_steps" integer DEFAULT 5,
	"summary" jsonb,
	"business_type" jsonb,
	"detected_vocab" jsonb,
	"error" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "knosia_connection_type" NOT NULL,
	"host" text NOT NULL,
	"port" integer,
	"database" text NOT NULL,
	"schema" text DEFAULT 'public',
	"credentials" text,
	"ssl_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_connection_health" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"status" "knosia_connection_status" DEFAULT 'connected' NOT NULL,
	"last_check" timestamp,
	"error_message" text,
	"latency_ms" integer,
	"uptime_percent" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_connection_schema" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"schema_snapshot" jsonb,
	"tables_count" integer DEFAULT 0,
	"extracted_at" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "knosia_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text,
	"context" jsonb,
	"status" "knosia_conversation_status" DEFAULT 'active' NOT NULL,
	"sharing" jsonb,
	"outcomes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_conversation_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" "knosia_message_role" NOT NULL,
	"content" text NOT NULL,
	"intent" text,
	"grounding" jsonb,
	"sql_generated" text,
	"visualization" jsonb,
	"confidence" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_mismatch_report" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"issue_type" "knosia_mismatch_issue" NOT NULL,
	"description" text,
	"status" "knosia_mismatch_status" DEFAULT 'pending' NOT NULL,
	"resolved_by" text,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "knosia_organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"industry" text,
	"size" text,
	"logo_url" text,
	"ai_config" jsonb,
	"governance" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_role_template" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"name" text NOT NULL,
	"description" text,
	"archetype" "knosia_role_archetype",
	"industry_variant" text,
	"seniority" "knosia_seniority",
	"cognitive_profile" jsonb,
	"briefing_config" jsonb,
	"question_patterns" jsonb,
	"learning_path" jsonb,
	"is_template" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_user_preference" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"favorites" jsonb,
	"aliases" jsonb,
	"notes" jsonb,
	"hidden_items" jsonb,
	"custom_views" jsonb,
	"notification" jsonb,
	"comparison_period" text DEFAULT 'MoM',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_vocabulary_item" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"org_id" text NOT NULL,
	"canonical_name" text NOT NULL,
	"abbreviation" text,
	"slug" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"type" "knosia_vocabulary_type" NOT NULL,
	"category" text,
	"semantics" jsonb,
	"current_version" integer DEFAULT 1,
	"status" "knosia_vocabulary_status" DEFAULT 'draft' NOT NULL,
	"governance" jsonb,
	"aggregation" "knosia_aggregation",
	"aggregation_confidence" integer,
	"cardinality" integer,
	"is_primary_time" boolean DEFAULT false,
	"joins_to" jsonb,
	"definition" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_vocabulary_version" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb,
	"created_by" text,
	"approved_by" text,
	"changelog" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"visibility" "knosia_workspace_visibility" DEFAULT 'org_wide' NOT NULL,
	"defaults" jsonb,
	"ai_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_workspace_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"schema_filters" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_workspace_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"role_id" text,
	"permissions" jsonb,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"invited_by" text,
	"status" "knosia_membership_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knosia_analysis" ADD CONSTRAINT "knosia_analysis_connection_id_knosia_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."knosia_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_analysis" ADD CONSTRAINT "knosia_analysis_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_connection" ADD CONSTRAINT "knosia_connection_org_id_knosia_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."knosia_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_connection_health" ADD CONSTRAINT "knosia_connection_health_connection_id_knosia_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."knosia_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_connection_schema" ADD CONSTRAINT "knosia_connection_schema_connection_id_knosia_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."knosia_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_conversation" ADD CONSTRAINT "knosia_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_conversation" ADD CONSTRAINT "knosia_conversation_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_conversation_message" ADD CONSTRAINT "knosia_conversation_message_conversation_id_knosia_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."knosia_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_mismatch_report" ADD CONSTRAINT "knosia_mismatch_report_item_id_knosia_vocabulary_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."knosia_vocabulary_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_mismatch_report" ADD CONSTRAINT "knosia_mismatch_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_mismatch_report" ADD CONSTRAINT "knosia_mismatch_report_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_mismatch_report" ADD CONSTRAINT "knosia_mismatch_report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_role_template" ADD CONSTRAINT "knosia_role_template_org_id_knosia_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."knosia_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_user_preference" ADD CONSTRAINT "knosia_user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_user_preference" ADD CONSTRAINT "knosia_user_preference_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_vocabulary_item" ADD CONSTRAINT "knosia_vocabulary_item_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_vocabulary_item" ADD CONSTRAINT "knosia_vocabulary_item_org_id_knosia_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."knosia_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_vocabulary_version" ADD CONSTRAINT "knosia_vocabulary_version_item_id_knosia_vocabulary_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."knosia_vocabulary_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_vocabulary_version" ADD CONSTRAINT "knosia_vocabulary_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_vocabulary_version" ADD CONSTRAINT "knosia_vocabulary_version_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace" ADD CONSTRAINT "knosia_workspace_org_id_knosia_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."knosia_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace_connection" ADD CONSTRAINT "knosia_workspace_connection_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace_connection" ADD CONSTRAINT "knosia_workspace_connection_connection_id_knosia_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."knosia_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace_membership" ADD CONSTRAINT "knosia_workspace_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace_membership" ADD CONSTRAINT "knosia_workspace_membership_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace_membership" ADD CONSTRAINT "knosia_workspace_membership_role_id_knosia_role_template_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."knosia_role_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_workspace_membership" ADD CONSTRAINT "knosia_workspace_membership_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;