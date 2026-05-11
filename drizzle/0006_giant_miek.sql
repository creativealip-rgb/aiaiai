CREATE TABLE "admin_action_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"diff" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "admin_action_logs_actor_id_idx" ON "admin_action_logs" USING btree ("actor_id");
--> statement-breakpoint
CREATE INDEX "admin_action_logs_entity_idx" ON "admin_action_logs" USING btree ("entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "admin_action_logs_created_at_idx" ON "admin_action_logs" USING btree ("created_at");
