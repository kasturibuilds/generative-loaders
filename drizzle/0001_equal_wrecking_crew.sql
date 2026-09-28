CREATE TABLE `analytics_budget` (
	`id` integer PRIMARY KEY NOT NULL,
	`minute` integer NOT NULL,
	`minute_count` integer NOT NULL,
	`day` text NOT NULL,
	`day_count` integer NOT NULL
);
