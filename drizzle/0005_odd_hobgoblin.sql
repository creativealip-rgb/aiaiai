CREATE TABLE "credential_access_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"order_item_id" text NOT NULL,
	"action" text DEFAULT 'view_credential' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credential_access_logs" ADD CONSTRAINT "credential_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_access_logs" ADD CONSTRAINT "credential_access_logs_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credential_access_logs_user_id_idx" ON "credential_access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credential_access_logs_order_item_id_idx" ON "credential_access_logs" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "credential_access_logs_created_at_idx" ON "credential_access_logs" USING btree ("created_at");
