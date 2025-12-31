ALTER TABLE "pdf"."embedding" ADD COLUMN "page_number" integer;--> statement-breakpoint
ALTER TABLE "pdf"."embedding" ADD COLUMN "char_start" integer;--> statement-breakpoint
ALTER TABLE "pdf"."embedding" ADD COLUMN "char_end" integer;--> statement-breakpoint
ALTER TABLE "pdf"."embedding" ADD COLUMN "section_title" text;