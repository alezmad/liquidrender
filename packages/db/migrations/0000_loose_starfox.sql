CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE SCHEMA "chat";
--> statement-breakpoint
CREATE SCHEMA "pdf";
--> statement-breakpoint
CREATE SCHEMA "image";
--> statement-breakpoint
CREATE TYPE "public"."credit_transaction_type" AS ENUM('signup', 'purchase', 'usage', 'admin_grant', 'admin_deduct', 'refund', 'promo', 'referral', 'expiry');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."knosia_activity_type" AS ENUM('thread_created', 'thread_shared', 'canvas_created', 'canvas_shared', 'canvas_updated', 'comment_added', 'insight_converted');--> statement-breakpoint
CREATE TYPE "public"."knosia_aggregation" AS ENUM('SUM', 'AVG', 'COUNT', 'MIN', 'MAX');--> statement-breakpoint
CREATE TYPE "public"."knosia_ai_insight_status" AS ENUM('pending', 'viewed', 'engaged', 'dismissed', 'converted');--> statement-breakpoint
CREATE TYPE "public"."knosia_analysis_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."knosia_canvas_block_type" AS ENUM('kpi', 'line_chart', 'bar_chart', 'area_chart', 'pie_chart', 'table', 'hero_metric', 'watch_list', 'comparison', 'insight', 'text');--> statement-breakpoint
CREATE TYPE "public"."knosia_canvas_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."knosia_comment_target" AS ENUM('thread_message', 'canvas_block', 'thread');--> statement-breakpoint
CREATE TYPE "public"."knosia_connection_status" AS ENUM('connected', 'error', 'stale');--> statement-breakpoint
CREATE TYPE "public"."knosia_connection_type" AS ENUM('postgres', 'mysql', 'snowflake', 'bigquery', 'redshift', 'duckdb');--> statement-breakpoint
CREATE TYPE "public"."knosia_membership_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."knosia_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."knosia_mismatch_issue" AS ENUM('wrong_mapping', 'wrong_name', 'missing', 'other');--> statement-breakpoint
CREATE TYPE "public"."knosia_mismatch_status" AS ENUM('pending', 'reviewed', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."knosia_notification_type" AS ENUM('alert', 'mention', 'share', 'ai_insight', 'thread_activity', 'digest');--> statement-breakpoint
CREATE TYPE "public"."knosia_role_archetype" AS ENUM('strategist', 'operator', 'analyst', 'builder');--> statement-breakpoint
CREATE TYPE "public"."knosia_seniority" AS ENUM('executive', 'director', 'manager', 'ic');--> statement-breakpoint
CREATE TYPE "public"."knosia_thread_status" AS ENUM('active', 'archived', 'shared');--> statement-breakpoint
CREATE TYPE "public"."knosia_vocabulary_status" AS ENUM('approved', 'draft', 'deprecated', 'archived');--> statement-breakpoint
CREATE TYPE "public"."knosia_vocabulary_type" AS ENUM('metric', 'dimension', 'entity', 'event');--> statement-breakpoint
CREATE TYPE "public"."knosia_workspace_visibility" AS ENUM('org_wide', 'team_only', 'private');--> statement-breakpoint
CREATE TYPE "public"."database_type" AS ENUM('postgres', 'mysql', 'sqlite', 'duckdb');--> statement-breakpoint
CREATE TYPE "public"."vocabulary_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "chat"."role" AS ENUM('system', 'assistant', 'user');--> statement-breakpoint
CREATE TYPE "pdf"."role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "pdf"."processing_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "pdf"."unit_type" AS ENUM('prose', 'heading', 'list', 'table', 'code');--> statement-breakpoint
CREATE TYPE "image"."aspect_ratio" AS ENUM('square', 'standard', 'landscape', 'portrait');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"is_anonymous" boolean DEFAULT false,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"reason" text,
	"metadata" text,
	"balance_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"status" "status",
	"plan" "plan",
	"credits" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "customer_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "customer_customerId_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "knosia_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "knosia_activity_type" NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"target_name" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_ai_insight" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"target_user_id" text,
	"headline" text NOT NULL,
	"explanation" text NOT NULL,
	"evidence" jsonb,
	"severity" text DEFAULT 'info',
	"category" text,
	"status" "knosia_ai_insight_status" DEFAULT 'pending' NOT NULL,
	"thread_id" text,
	"surfaced_at" timestamp DEFAULT now() NOT NULL,
	"viewed_at" timestamp,
	"engaged_at" timestamp,
	"dismissed_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "knosia_canvas" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"status" "knosia_canvas_status" DEFAULT 'active' NOT NULL,
	"is_ai_generated" boolean DEFAULT false,
	"layout" jsonb DEFAULT '{"type":"grid","columns":12}'::jsonb,
	"visibility" "knosia_workspace_visibility" DEFAULT 'private' NOT NULL,
	"shared_with" jsonb DEFAULT '[]'::jsonb,
	"last_viewed_at" timestamp,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_canvas_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"block_id" text,
	"name" text NOT NULL,
	"condition" jsonb NOT NULL,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb,
	"enabled" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_canvas_block" (
	"id" text PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"type" "knosia_canvas_block_type" NOT NULL,
	"title" text,
	"position" jsonb NOT NULL,
	"config" jsonb,
	"data_source" jsonb,
	"cached_data" jsonb,
	"cached_at" timestamp,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" "knosia_comment_target" NOT NULL,
	"target_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
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
CREATE TABLE "knosia_digest" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"schedule" text NOT NULL,
	"channels" jsonb DEFAULT '["email"]'::jsonb,
	"include" jsonb,
	"enabled" boolean DEFAULT true,
	"last_sent_at" timestamp,
	"next_send_at" timestamp,
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
CREATE TABLE "knosia_notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"type" "knosia_notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"source_type" text,
	"source_id" text,
	"read" boolean DEFAULT false,
	"dismissed" boolean DEFAULT false,
	"actions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"is_guest" boolean DEFAULT false,
	"expires_at" timestamp,
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
CREATE TABLE "knosia_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text,
	"context" jsonb,
	"status" "knosia_thread_status" DEFAULT 'active' NOT NULL,
	"sharing" jsonb,
	"outcomes" jsonb,
	"is_ai_initiated" boolean DEFAULT false,
	"starred" boolean DEFAULT false,
	"parent_thread_id" text,
	"forked_from_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_thread_message" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"role" "knosia_message_role" NOT NULL,
	"content" text NOT NULL,
	"intent" text,
	"grounding" jsonb,
	"sql_generated" text,
	"visualization" jsonb,
	"confidence" real,
	"provenance" jsonb,
	"comment_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knosia_thread_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"message_count" integer NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"compiled_vocabulary" jsonb,
	"vocabulary_version" integer DEFAULT 1,
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
CREATE TABLE "chat"."chat" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat"."message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" "chat"."role" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat"."part" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"type" text NOT NULL,
	"order" integer NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf"."chat" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf"."citation_unit" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"retrieval_chunk_id" text,
	"content" text NOT NULL,
	"page_number" integer NOT NULL,
	"paragraph_index" integer NOT NULL,
	"char_start" integer NOT NULL,
	"char_end" integer NOT NULL,
	"bbox_x" real,
	"bbox_y" real,
	"bbox_width" real,
	"bbox_height" real,
	"section_title" text,
	"unit_type" "pdf"."unit_type" DEFAULT 'prose',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf"."document" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"processing_status" "pdf"."processing_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf"."embedding" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"page_number" integer,
	"char_start" integer,
	"char_end" integer,
	"section_title" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf"."message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"content" text NOT NULL,
	"role" "pdf"."role" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf"."retrieval_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"page_start" integer NOT NULL,
	"page_end" integer NOT NULL,
	"section_hierarchy" text[],
	"chunk_type" text DEFAULT 'prose',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "image"."generation" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"aspect_ratio" "image"."aspect_ratio" DEFAULT 'square' NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "image"."image" (
	"id" text PRIMARY KEY NOT NULL,
	"generation_id" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_activity" ADD CONSTRAINT "knosia_activity_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_activity" ADD CONSTRAINT "knosia_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_ai_insight" ADD CONSTRAINT "knosia_ai_insight_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_ai_insight" ADD CONSTRAINT "knosia_ai_insight_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_ai_insight" ADD CONSTRAINT "knosia_ai_insight_thread_id_knosia_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."knosia_thread"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_analysis" ADD CONSTRAINT "knosia_analysis_connection_id_knosia_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."knosia_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_analysis" ADD CONSTRAINT "knosia_analysis_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_canvas" ADD CONSTRAINT "knosia_canvas_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_canvas" ADD CONSTRAINT "knosia_canvas_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_canvas_alert" ADD CONSTRAINT "knosia_canvas_alert_canvas_id_knosia_canvas_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."knosia_canvas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_canvas_alert" ADD CONSTRAINT "knosia_canvas_alert_block_id_knosia_canvas_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."knosia_canvas_block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_canvas_block" ADD CONSTRAINT "knosia_canvas_block_canvas_id_knosia_canvas_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."knosia_canvas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_comment" ADD CONSTRAINT "knosia_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_connection" ADD CONSTRAINT "knosia_connection_org_id_knosia_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."knosia_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_connection_health" ADD CONSTRAINT "knosia_connection_health_connection_id_knosia_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."knosia_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_connection_schema" ADD CONSTRAINT "knosia_connection_schema_connection_id_knosia_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."knosia_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_digest" ADD CONSTRAINT "knosia_digest_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_digest" ADD CONSTRAINT "knosia_digest_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_mismatch_report" ADD CONSTRAINT "knosia_mismatch_report_item_id_knosia_vocabulary_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."knosia_vocabulary_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_mismatch_report" ADD CONSTRAINT "knosia_mismatch_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_mismatch_report" ADD CONSTRAINT "knosia_mismatch_report_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_mismatch_report" ADD CONSTRAINT "knosia_mismatch_report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_notification" ADD CONSTRAINT "knosia_notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_notification" ADD CONSTRAINT "knosia_notification_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_role_template" ADD CONSTRAINT "knosia_role_template_org_id_knosia_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."knosia_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_thread" ADD CONSTRAINT "knosia_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_thread" ADD CONSTRAINT "knosia_thread_workspace_id_knosia_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."knosia_workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_thread_message" ADD CONSTRAINT "knosia_thread_message_thread_id_knosia_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."knosia_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_thread_snapshot" ADD CONSTRAINT "knosia_thread_snapshot_thread_id_knosia_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."knosia_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knosia_thread_snapshot" ADD CONSTRAINT "knosia_thread_snapshot_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "knosia_workspace_membership" ADD CONSTRAINT "knosia_workspace_membership_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat"."chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat"."message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chat"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat"."part" ADD CONSTRAINT "part_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "chat"."message"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."citation_unit" ADD CONSTRAINT "citation_unit_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "pdf"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."citation_unit" ADD CONSTRAINT "citation_unit_retrieval_chunk_id_retrieval_chunk_id_fk" FOREIGN KEY ("retrieval_chunk_id") REFERENCES "pdf"."retrieval_chunk"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."document" ADD CONSTRAINT "document_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "pdf"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."embedding" ADD CONSTRAINT "embedding_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "pdf"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "pdf"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."retrieval_chunk" ADD CONSTRAINT "retrieval_chunk_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "pdf"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "image"."generation" ADD CONSTRAINT "generation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "image"."image" ADD CONSTRAINT "image_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "image"."generation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_cu_document" ON "pdf"."citation_unit" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_cu_retrieval" ON "pdf"."citation_unit" USING btree ("retrieval_chunk_id");--> statement-breakpoint
CREATE INDEX "idx_cu_page" ON "pdf"."citation_unit" USING btree ("document_id","page_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cu_unique" ON "pdf"."citation_unit" USING btree ("document_id","page_number","paragraph_index");--> statement-breakpoint
CREATE INDEX "pdf_embeddingIndex" ON "pdf"."embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_rc_document" ON "pdf"."retrieval_chunk" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_rc_embedding" ON "pdf"."retrieval_chunk" USING hnsw ("embedding" vector_cosine_ops);