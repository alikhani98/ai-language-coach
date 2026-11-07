CREATE TABLE `ai_shared_key_policy` (
	`id` char(1) NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ai_shared_key_policy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_ai_settings` (
	`user_id` char(36) NOT NULL,
	`provider` enum('openrouter') NOT NULL DEFAULT 'openrouter',
	`encrypted_api_key` text NOT NULL,
	`key_fingerprint` char(64) NOT NULL,
	`key_last4` char(4) NOT NULL,
	`lesson_model` varchar(191) NOT NULL,
	`conversation_model` varchar(191) NOT NULL,
	`analysis_model` varchar(191) NOT NULL,
	`source_preference` enum('user','shared') NOT NULL DEFAULT 'user',
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_ai_settings_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `user_ai_settings` ADD CONSTRAINT `user_ai_settings_user_id_app_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON DELETE cascade ON UPDATE no action;