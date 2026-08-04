CREATE TABLE `actors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actors_name_unique` ON `actors` (`name`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scheme_code` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`scheme_code`) REFERENCES `category_schemes`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_scheme_name_unique` ON `categories` (`scheme_code`,`name`);--> statement-breakpoint
CREATE TABLE `category_schemes` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`applies_to` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `designation_categories` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tier` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `designation_categories_name_unique` ON `designation_categories` (`name`);--> statement-breakpoint
CREATE TABLE `designations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`category_code` text NOT NULL,
	`designated_on` text,
	`date_precision` text NOT NULL,
	`source_date` text,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_code`) REFERENCES `designation_categories`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `designations_property_category_unique` ON `designations` (`property_id`,`category_code`);--> statement-breakpoint
CREATE INDEX `designations_property_idx` ON `designations` (`property_id`);--> statement-breakpoint
CREATE INDEX `designations_category_date_idx` ON `designations` (`category_code`,`designated_on`);--> statement-breakpoint
CREATE TABLE `heritage_types` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`group_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `heritage_types_name_unique` ON `heritage_types` (`name`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prefecture` text,
	`address_text` text,
	`raw` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `places_raw_unique` ON `places` (`raw`);--> statement-breakpoint
CREATE INDEX `places_prefecture_idx` ON `places` (`prefecture`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`register_code` text NOT NULL,
	`target_id` text NOT NULL,
	`source_target_id` text NOT NULL,
	`heritage_type_code` text NOT NULL,
	`name` text NOT NULL,
	`unit_name` text,
	`period_text` text,
	`origin_country` text,
	`facility_name` text,
	`location_text` text,
	`latitude` real,
	`longitude` real,
	`coordinate_note` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`register_code`) REFERENCES `registers`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`heritage_type_code`) REFERENCES `heritage_types`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `properties_register_target_unique` ON `properties` (`register_code`,`target_id`);--> statement-breakpoint
CREATE INDEX `properties_heritage_type_idx` ON `properties` (`heritage_type_code`);--> statement-breakpoint
CREATE INDEX `properties_register_idx` ON `properties` (`register_code`);--> statement-breakpoint
CREATE INDEX `properties_name_idx` ON `properties` (`name`);--> statement-breakpoint
CREATE TABLE `property_actors` (
	`property_id` integer NOT NULL,
	`actor_id` integer NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`property_id`, `actor_id`, `role`),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `actors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `property_actors_actor_role_idx` ON `property_actors` (`actor_id`,`role`);--> statement-breakpoint
CREATE TABLE `property_categories` (
	`property_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	PRIMARY KEY(`property_id`, `category_id`),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `property_categories_category_idx` ON `property_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `property_places` (
	`property_id` integer NOT NULL,
	`place_id` integer NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`property_id`, `place_id`, `role`),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `property_places_place_role_idx` ON `property_places` (`place_id`,`role`);--> statement-breakpoint
CREATE TABLE `registers` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`publisher` text NOT NULL,
	`url` text NOT NULL,
	`terms_url` text NOT NULL,
	`license_note` text NOT NULL,
	`retrieved_on` text NOT NULL,
	`processing_note` text NOT NULL
);
