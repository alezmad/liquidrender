CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE SCHEMA "chat";
--> statement-breakpoint
CREATE SCHEMA "pdf";
--> statement-breakpoint
CREATE SCHEMA "image";
--> statement-breakpoint
CREATE TYPE "chat"."role" AS ENUM('system', 'assistant', 'user');--> statement-breakpoint
CREATE TYPE "pdf"."role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "image"."aspect_ratio" AS ENUM('square', 'standard', 'landscape', 'portrait');--> statement-breakpoint
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
CREATE TABLE "pdf"."document" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf"."embedding" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
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
ALTER TABLE "chat"."chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat"."message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chat"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chat"."part" ADD CONSTRAINT "part_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "chat"."message"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."document" ADD CONSTRAINT "document_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "pdf"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."embedding" ADD CONSTRAINT "embedding_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "pdf"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."message" ADD CONSTRAINT "message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "pdf"."chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "image"."generation" ADD CONSTRAINT "generation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "image"."image" ADD CONSTRAINT "image_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "image"."generation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "pdf_embeddingIndex" ON "pdf"."embedding" USING hnsw ("embedding" vector_cosine_ops);