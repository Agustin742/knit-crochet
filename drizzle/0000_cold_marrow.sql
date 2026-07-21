CREATE TYPE "public"."color_family" AS ENUM('red', 'orange', 'yellow', 'green', 'blue', 'violet', 'pink', 'brown', 'gray', 'black', 'white', 'neutral', 'multicolor');--> statement-breakpoint
CREATE TYPE "public"."craft_type" AS ENUM('knitting', 'crochet');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('in_progress', 'paused', 'finished', 'abandoned');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"type" "craft_type" NOT NULL,
	"instructions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"in_library" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yarn_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yarns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"image" text,
	"brand_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"color_name" text NOT NULL,
	"color_code" text NOT NULL,
	"color_family" "color_family" NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"used_quantity" integer DEFAULT 0 NOT NULL,
	"length" real NOT NULL,
	"fiber" text NOT NULL,
	"recommended_needle" jsonb NOT NULL,
	"thickness" real NOT NULL,
	"lot" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "yarns_brand_color_code_unique" UNIQUE("brand_id","color_code")
);
--> statement-breakpoint
CREATE TABLE "project_yarns" (
	"project_id" uuid NOT NULL,
	"yarn_id" uuid NOT NULL,
	CONSTRAINT "project_yarns_project_id_yarn_id_pk" PRIMARY KEY("project_id","yarn_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"type" "craft_type" NOT NULL,
	"status" "project_status" DEFAULT 'in_progress' NOT NULL,
	"rounds" integer DEFAULT 0 NOT NULL,
	"target_rounds" integer DEFAULT 0 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"needles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"time" integer DEFAULT 0 NOT NULL,
	"pattern_id" uuid,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "craft_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"start" timestamp DEFAULT now() NOT NULL,
	"end" timestamp,
	"duration" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarn_types" ADD CONSTRAINT "yarn_types_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_type_id_yarn_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."yarn_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_yarns" ADD CONSTRAINT "project_yarns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_yarns" ADD CONSTRAINT "project_yarns_yarn_id_yarns_id_fk" FOREIGN KEY ("yarn_id") REFERENCES "public"."yarns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craft_sessions" ADD CONSTRAINT "craft_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craft_sessions" ADD CONSTRAINT "craft_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;