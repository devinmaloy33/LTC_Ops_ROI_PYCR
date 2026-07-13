CREATE TABLE `facilities` (
	`ccn` text PRIMARY KEY NOT NULL,
	`facility_name` text NOT NULL,
	`legal_business_name` text,
	`address` text,
	`city` text,
	`state` text,
	`zip` text,
	`chain_name` text,
	`chain_facilities` integer,
	`beds` integer,
	`residents` integer,
	`overall_rating` integer,
	`staffing_rating` integer,
	`health_inspection_rating` integer,
	`quality_measure_rating` integer,
	`turnover_rate` integer,
	`rn_turnover` integer,
	`total_fines` integer,
	`health_deficiencies` integer,
	`cms_retrieved_at` integer NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `facilities_state_idx` ON `facilities` (`state`);--> statement-breakpoint
CREATE INDEX `facilities_last_seen_idx` ON `facilities` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `facility_engagements` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`ccn` text NOT NULL,
	`started_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`is_complete` integer DEFAULT false NOT NULL,
	`missing_fields_json` text DEFAULT '[]' NOT NULL,
	`calculator_snapshot_json` text,
	`download_count` integer DEFAULT 0 NOT NULL,
	`last_downloaded_at` integer,
	FOREIGN KEY (`ccn`) REFERENCES `facilities`(`ccn`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facility_engagements_session_ccn_uidx` ON `facility_engagements` (`session_id`,`ccn`);--> statement-breakpoint
CREATE INDEX `facility_engagements_ccn_idx` ON `facility_engagements` (`ccn`);--> statement-breakpoint
CREATE INDEX `facility_engagements_last_activity_idx` ON `facility_engagements` (`last_activity_at`);--> statement-breakpoint
CREATE TABLE `facility_events` (
	`id` text PRIMARY KEY NOT NULL,
	`engagement_id` text NOT NULL,
	`ccn` text NOT NULL,
	`event_type` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`engagement_id`) REFERENCES `facility_engagements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ccn`) REFERENCES `facilities`(`ccn`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `facility_events_ccn_time_idx` ON `facility_events` (`ccn`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `facility_events_engagement_idx` ON `facility_events` (`engagement_id`);--> statement-breakpoint
CREATE TABLE `outreach_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`ccn` text NOT NULL,
	`creator_email` text NOT NULL,
	`persona` text NOT NULL,
	`contact_name` text,
	`contact_title` text,
	`admin_notes` text,
	`selected_facts_json` text NOT NULL,
	`campaign_json` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ccn`) REFERENCES `facilities`(`ccn`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `outreach_campaigns_ccn_time_idx` ON `outreach_campaigns` (`ccn`,`created_at`);