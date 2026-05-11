CREATE TYPE "public"."delivery_type" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('account', 'service');--> statement-breakpoint
CREATE TYPE "public"."stock_mode" AS ENUM('tracked', 'unlimited');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"stock_mode" "stock_mode" DEFAULT 'tracked' NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"type" "product_type" DEFAULT 'account' NOT NULL,
	"base_price" numeric(14, 2) NOT NULL,
	"discount_price" numeric(14, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"delivery_type" "delivery_type" DEFAULT 'auto' NOT NULL,
	"warranty_days" integer DEFAULT 0 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sold_count" integer DEFAULT 0 NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT '0' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_is_active_sort_idx" ON "categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_unique_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_active_idx" ON "product_variants" USING btree ("product_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_type_idx" ON "products" USING btree ("type");--> statement-breakpoint
CREATE INDEX "products_active_featured_idx" ON "products" USING btree ("is_active","is_featured");--> statement-breakpoint
CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "products_sold_count_idx" ON "products" USING btree ("sold_count");--> statement-breakpoint
CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");