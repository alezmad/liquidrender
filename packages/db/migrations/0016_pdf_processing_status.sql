-- Add processing status enum and fields to pdf.document
-- Tracks embedding generation state for proper UI feedback

CREATE TYPE "pdf"."processing_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "pdf"."document" ADD COLUMN "processing_status" "pdf"."processing_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "pdf"."document" ADD COLUMN "processing_error" text;
