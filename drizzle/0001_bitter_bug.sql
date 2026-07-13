CREATE TABLE `do_not_call_numbers` (
	`phone_number` text PRIMARY KEY NOT NULL,
	`ccn` text,
	`source_call_id` text,
	`reason` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ccn`) REFERENCES `facilities`(`ccn`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_call_id`) REFERENCES `voice_calls`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `do_not_call_numbers_ccn_idx` ON `do_not_call_numbers` (`ccn`);--> statement-breakpoint
CREATE TABLE `voice_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`ccn` text NOT NULL,
	`campaign_id` text,
	`creator_email` text NOT NULL,
	`phone_number` text NOT NULL,
	`persona` text NOT NULL,
	`known_contact_name` text,
	`known_contact_title` text,
	`known_contact_email` text,
	`known_contact_extension` text,
	`agent_id` text NOT NULL,
	`agent_phone_number_id` text NOT NULL,
	`conversation_id` text,
	`provider_call_sid` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`transcript_json` text DEFAULT '[]' NOT NULL,
	`summary` text,
	`call_successful` integer,
	`duration_seconds` integer,
	`cost_credits` integer,
	`captured_contact_name` text,
	`captured_contact_title` text,
	`captured_contact_email` text,
	`captured_contact_extension` text,
	`appointment_status` text DEFAULT 'none' NOT NULL,
	`appointment_details` text,
	`outcome_notes` text,
	`opted_out` integer DEFAULT false NOT NULL,
	`failure_reason` text,
	`compliance_attested_at` integer NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`ccn`) REFERENCES `facilities`(`ccn`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `outreach_campaigns`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `voice_calls_ccn_time_idx` ON `voice_calls` (`ccn`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `voice_calls_conversation_uidx` ON `voice_calls` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `voice_calls_status_idx` ON `voice_calls` (`status`);