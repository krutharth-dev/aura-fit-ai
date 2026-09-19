CREATE TABLE `workout_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`minutes` integer NOT NULL,
	`exercises_json` text NOT NULL,
	`notes` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_entries_owner_date_idx` ON `workout_entries` (`owner_id`,`date`);