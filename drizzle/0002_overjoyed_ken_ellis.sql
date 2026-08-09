CREATE TABLE `fitness_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`goal` text NOT NULL,
	`experience` text NOT NULL,
	`days_per_week` integer NOT NULL,
	`session_minutes` integer NOT NULL,
	`equipment` text NOT NULL,
	`limitations` text NOT NULL,
	`preferred_exercises` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fitness_profiles_updated_idx` ON `fitness_profiles` (`updated_at`);