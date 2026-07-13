CREATE TABLE `voice_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`conversation_id` text,
	`event_timestamp` integer NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `voice_webhook_conversation_idx` ON `voice_webhook_events` (`conversation_id`);--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `campaign_touch_day` integer;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `call_brief_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `agent_version_id` text;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `connection_outcome` text;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `phone_tree_path` text;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `voicemail_left` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `data_collection_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `evaluations_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `preferred_day` text;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `preferred_time_window` text;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `preferred_timezone` text;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `follow_up_permission` integer;--> statement-breakpoint
ALTER TABLE `voice_calls` ADD `auto_extracted_at` integer;