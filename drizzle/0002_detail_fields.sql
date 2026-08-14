CREATE TABLE `change_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `change_types_name_unique` ON `change_types` (`name`);--> statement-breakpoint
CREATE TABLE `designation_criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`text` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `designation_criteria_kind_text_unique` ON `designation_criteria` (`kind`,`text`);--> statement-breakpoint
CREATE TABLE `detail_fields` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`applies_to` text NOT NULL,
	`display_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `property_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity_text` text,
	`ordinal` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `property_attachments_property_idx` ON `property_attachments` (`property_id`);--> statement-breakpoint
CREATE TABLE `property_change_types` (
	`change_id` integer NOT NULL,
	`type_id` integer NOT NULL,
	PRIMARY KEY(`change_id`, `type_id`),
	FOREIGN KEY (`change_id`) REFERENCES `property_changes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `change_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `property_change_types_type_idx` ON `property_change_types` (`type_id`);--> statement-breakpoint
CREATE TABLE `property_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`changed_on` text,
	`date_precision` text NOT NULL,
	`source_date` text,
	`content` text,
	`ordinal` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `property_changes_property_idx` ON `property_changes` (`property_id`);--> statement-breakpoint
CREATE INDEX `property_changes_date_idx` ON `property_changes` (`changed_on`);--> statement-breakpoint
CREATE TABLE `property_designation_criteria` (
	`property_id` integer NOT NULL,
	`criterion_id` integer NOT NULL,
	`slot` integer NOT NULL,
	PRIMARY KEY(`property_id`, `criterion_id`),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`criterion_id`) REFERENCES `designation_criteria`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `property_designation_criteria_criterion_idx` ON `property_designation_criteria` (`criterion_id`);--> statement-breakpoint
CREATE TABLE `property_details` (
	`property_id` integer NOT NULL,
	`field_code` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`property_id`, `field_code`),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_code`) REFERENCES `detail_fields`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `property_details_field_idx` ON `property_details` (`field_code`);--> statement-breakpoint
CREATE TABLE `property_holders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`kind` text NOT NULL,
	`actor_id` integer,
	`certified_on` text,
	`date_precision` text NOT NULL,
	`certification_round` text,
	`ordinal` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `actors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `property_holders_property_idx` ON `property_holders` (`property_id`);--> statement-breakpoint
CREATE INDEX `property_holders_actor_idx` ON `property_holders` (`actor_id`);--> statement-breakpoint
ALTER TABLE `actors` ADD `name_kana` text;--> statement-breakpoint
ALTER TABLE `designations` ADD `japanese_era_date` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `name_kana` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `unit_name_kana` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `quantity_text` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `era_text` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `year_text` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `year_from` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `year_to` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `area_text` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `area_hectares` real;--> statement-breakpoint
ALTER TABLE `properties` ADD `owner_kind` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `summary_text` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `detail_text` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `has_photo` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `has_attachment` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `detail_retrieved_on` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `designation_number` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `branch_number` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `notification_number` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `notified_on` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `added_on` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `registration_round` text;--> statement-breakpoint
CREATE INDEX `properties_name_kana_idx` ON `properties` (`name_kana`);--> statement-breakpoint
CREATE INDEX `properties_year_idx` ON `properties` (`year_from`,`year_to`);