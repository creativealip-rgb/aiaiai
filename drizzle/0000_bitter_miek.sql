CREATE TABLE "health_check" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
