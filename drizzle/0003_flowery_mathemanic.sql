CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'processing', 'delivered', 'partial_delivered', 'cancelled', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'refunded');--> statement-breakpoint
CREATE TABLE "order_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(14, 2),
	"line_total" numeric(14, 2),
	"product_snapshot" jsonb,
	"account_stock_id" text,
	"delivered_at" timestamp with time zone,
	"delivery_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"user_id" text NOT NULL,
	"is_guest_order" boolean DEFAULT false NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"subtotal" numeric(14, 2),
	"discount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2),
	"voucher_id" text,
	"payment_method" text,
	"wallet_used" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"gateway" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"user_id" text NOT NULL,
	"gateway" text NOT NULL,
	"gateway_ref" text,
	"amount" numeric(14, 2) NOT NULL,
	"fee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"method" text,
	"paid_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"raw_request" jsonb,
	"raw_response" jsonb,
	"webhook_received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_access_tokens" ADD CONSTRAINT "order_access_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_access_tokens_token_hash_unique_idx" ON "order_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "order_access_tokens_order_id_idx" ON "order_access_tokens" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_unique_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_user_id_status_idx" ON "orders" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "orders_status_expires_at_idx" ON "orders" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_events_event_id_unique_idx" ON "payment_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_gateway_ref_unique_idx" ON "payments" USING btree ("gateway_ref");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");