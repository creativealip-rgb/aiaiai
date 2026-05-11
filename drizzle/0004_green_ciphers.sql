CREATE TYPE "public"."account_stock_status" AS ENUM('available', 'reserved', 'sold', 'disabled');--> statement-breakpoint
CREATE TABLE "account_stocks" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"credential_ciphertext" text NOT NULL,
	"credential_iv" text NOT NULL,
	"credential_tag" text NOT NULL,
	"label" text,
	"notes" text,
	"status" "account_stock_status" DEFAULT 'available' NOT NULL,
	"reserved_until" timestamp with time zone,
	"sold_to_order_item_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_stocks" ADD CONSTRAINT "account_stocks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_stocks" ADD CONSTRAINT "account_stocks_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_stocks_product_variant_status_idx" ON "account_stocks" USING btree ("product_id","variant_id","status");--> statement-breakpoint
CREATE INDEX "account_stocks_status_reserved_until_idx" ON "account_stocks" USING btree ("status","reserved_until");
