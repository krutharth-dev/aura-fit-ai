CREATE TABLE `error_events` (
	`id` text PRIMARY KEY NOT NULL,
	`area` text NOT NULL,
	`code` text NOT NULL,
	`route` text NOT NULL,
	`auth_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `error_events_created_idx` ON `error_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `error_events_code_created_idx` ON `error_events` (`code`,`created_at`);--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`route` text NOT NULL,
	`auth_type` text NOT NULL,
	`status_code` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_events_created_idx` ON `usage_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `usage_events_name_created_idx` ON `usage_events` (`event_name`,`created_at`);--> statement-breakpoint
DELETE FROM `messages` WHERE `conversation_id` IN (
	SELECT `id` FROM `conversations` WHERE `device_id` LIKE 'device_%'
);--> statement-breakpoint
DELETE FROM `conversations` WHERE `device_id` LIKE 'device_%';--> statement-breakpoint
DELETE FROM `fitness_profiles` WHERE `owner_id` LIKE 'device_%';
