CREATE TYPE "pdf"."unit_type" AS ENUM('prose', 'heading', 'list', 'table', 'code');--> statement-breakpoint
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
ALTER TABLE "pdf"."citation_unit" ADD CONSTRAINT "citation_unit_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "pdf"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."citation_unit" ADD CONSTRAINT "citation_unit_retrieval_chunk_id_retrieval_chunk_id_fk" FOREIGN KEY ("retrieval_chunk_id") REFERENCES "pdf"."retrieval_chunk"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pdf"."retrieval_chunk" ADD CONSTRAINT "retrieval_chunk_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "pdf"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_cu_document" ON "pdf"."citation_unit" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_cu_retrieval" ON "pdf"."citation_unit" USING btree ("retrieval_chunk_id");--> statement-breakpoint
CREATE INDEX "idx_cu_page" ON "pdf"."citation_unit" USING btree ("document_id","page_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cu_unique" ON "pdf"."citation_unit" USING btree ("document_id","page_number","paragraph_index");--> statement-breakpoint
CREATE INDEX "idx_rc_document" ON "pdf"."retrieval_chunk" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_rc_embedding" ON "pdf"."retrieval_chunk" USING hnsw ("embedding" vector_cosine_ops);