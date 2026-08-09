CREATE TABLE `rate_limits` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_reset_idx` ON `rate_limits` (`reset_at`);--> statement-breakpoint
WITH ranked AS (
	SELECT `id`, ROW_NUMBER() OVER (
		PARTITION BY `conversation_id`
		ORDER BY `sequence`, `created_at`, `id`
	) AS `new_sequence`
	FROM `messages`
)
UPDATE `messages`
SET `sequence` = (
	SELECT `new_sequence` FROM ranked WHERE ranked.`id` = `messages`.`id`
);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_conversation_sequence_unique` ON `messages` (`conversation_id`,`sequence`);
