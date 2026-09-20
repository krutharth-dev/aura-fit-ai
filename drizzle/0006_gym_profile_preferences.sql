CREATE TABLE `fitness_profile_preferences` (
  `owner_id` text PRIMARY KEY NOT NULL,
  `split_preference` text NOT NULL,
  `training_style` text NOT NULL,
  `priority_muscles_json` text NOT NULL,
  `cardio_preference` text NOT NULL,
  `disliked_exercises` text NOT NULL,
  `updated_at` integer NOT NULL
);
