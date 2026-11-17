CREATE TYPE "public"."post_status" AS ENUM('pending', 'published', 'hidden');--> statement-breakpoint
CREATE TABLE "posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"place_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"story" text NOT NULL,
	"rating" integer NOT NULL,
	"visited_at" date NOT NULL,
	"status" "post_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_rating_range" CHECK ("posts"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "post_id" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_place_status_idx" ON "posts" USING btree ("place_id","status","created_at");--> statement-breakpoint
CREATE INDEX "posts_user_idx" ON "posts" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_post_idx" ON "photos" USING btree ("post_id");