ALTER TABLE "stories" ADD COLUMN "predecessor_id" uuid;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "successor_id" uuid;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_predecessor_id_stories_story_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."stories"("story_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_successor_id_stories_story_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."stories"("story_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_stories_predecessor_id" ON "stories" USING btree ("predecessor_id");--> statement-breakpoint
CREATE INDEX "idx_stories_successor_id" ON "stories" USING btree ("successor_id");--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "chk_story_no_self_predecessor" CHECK ("stories"."predecessor_id" <> "stories"."story_id");--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "chk_story_no_self_successor" CHECK ("stories"."successor_id" <> "stories"."story_id");