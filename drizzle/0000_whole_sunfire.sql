CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `conversations_device_updated_idx` ON `conversations` (`device_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`route` text,
	`source` text,
	`trace_json` text,
	`created_at` integer NOT NULL,
	`sequence` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_sequence_idx` ON `messages` (`conversation_id`,`sequence`);