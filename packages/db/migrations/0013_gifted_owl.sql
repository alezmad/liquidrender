CREATE TYPE "public"."credit_transaction_type" AS ENUM('signup', 'purchase', 'usage', 'admin_grant', 'admin_deduct', 'refund', 'promo', 'referral', 'expiry');--> statement-breakpoint
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
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;