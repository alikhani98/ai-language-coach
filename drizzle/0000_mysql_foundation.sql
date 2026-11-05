-- MySQL 8.0.45 foundation for the future self-hosted Zaban data path.
-- This migration is intentionally schema-only. It must not be applied by this
-- phase and it does not read from, write to, or replace Supabase.
--
-- UUIDs are stored as canonical CHAR(36) ASCII values. Application services
-- generate UUIDs; MySQL does not supply a UUID default. DATETIME(3) values are
-- UTC by contract: the runtime pool uses timezone=Z and all writers use UTC.
-- Application services own authorization because MySQL has no Supabase RLS.

CREATE TABLE `app_users` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `auth_provider` ENUM('supabase','better_auth') NOT NULL DEFAULT 'supabase',
  `auth_subject_id` VARCHAR(191) NOT NULL,
  `role` ENUM('learner','admin') NOT NULL DEFAULT 'learner',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `app_users_pk` PRIMARY KEY (`id`),
  CONSTRAINT `app_users_provider_subject_unique` UNIQUE (`auth_provider`, `auth_subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users_profile` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `level` VARCHAR(32) NOT NULL,
  `goal` VARCHAR(32) NOT NULL,
  `daily_minutes` INT NOT NULL DEFAULT 15,
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'UTC',
  `interface_language` ENUM('en','fa') NOT NULL DEFAULT 'en',
  `theme_preference` ENUM('light','dark','system','auto') NOT NULL DEFAULT 'system',
  `status` ENUM('pending','active','suspended','rejected') NOT NULL DEFAULT 'pending',
  `approved_at` DATETIME(3) NULL,
  `approved_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `users_profile_pk` PRIMARY KEY (`id`),
  CONSTRAINT `users_profile_user_unique` UNIQUE (`user_id`),
  CONSTRAINT `users_profile_daily_minutes_check` CHECK (`daily_minutes` BETWEEN 10 AND 30),
  CONSTRAINT `users_profile_user_fk` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `users_profile_approved_by_fk` FOREIGN KEY (`approved_by`) REFERENCES `app_users` (`id`) ON DELETE SET NULL,
  INDEX `users_profile_status_created_idx` (`status`, `created_at`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `daily_lessons` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `date` DATE NOT NULL,
  `words` JSON NOT NULL,
  `sentence` TEXT NOT NULL,
  `reading_text` TEXT NOT NULL,
  `speaking_task` TEXT NOT NULL,
  `completed` TINYINT NOT NULL DEFAULT 0,
  `generation_status` ENUM('pending','ready','failed') NOT NULL DEFAULT 'ready',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `daily_lessons_pk` PRIMARY KEY (`id`),
  CONSTRAINT `daily_lessons_user_date_unique` UNIQUE (`user_id`, `date`),
  CONSTRAINT `daily_lessons_words_array_check` CHECK (JSON_TYPE(`words`) = 'ARRAY'),
  CONSTRAINT `daily_lessons_completed_check` CHECK (`completed` IN (0, 1)),
  CONSTRAINT `daily_lessons_user_fk` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE,
  INDEX `daily_lessons_user_date_idx` (`user_id`, `date`),
  INDEX `daily_lessons_user_status_idx` (`user_id`, `generation_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversations` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `topic` VARCHAR(32) NOT NULL,
  `messages` JSON NOT NULL,
  `feedback` TEXT NULL,
  `status` ENUM('active','ended') NOT NULL DEFAULT 'active',
  `active_request_id` VARCHAR(128) NULL,
  `active_generation_started_at` DATETIME(3) NULL,
  `ended_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `conversations_pk` PRIMARY KEY (`id`),
  CONSTRAINT `conversations_messages_array_check` CHECK (JSON_TYPE(`messages`) = 'ARRAY'),
  CONSTRAINT `conversations_user_fk` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE,
  INDEX `conversations_user_created_at_idx` (`user_id`, `created_at`),
  INDEX `conversations_user_updated_at_idx` (`user_id`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversation_messages` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `role` ENUM('user','assistant') NOT NULL,
  `content` TEXT NOT NULL,
  `corrections` JSON NOT NULL,
  `request_id` VARCHAR(128) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `conversation_messages_pk` PRIMARY KEY (`id`),
  -- NULL request IDs remain non-unique, matching PostgreSQL's legacy behavior.
  CONSTRAINT `conversation_messages_request_unique` UNIQUE (`conversation_id`, `role`, `request_id`),
  CONSTRAINT `conversation_messages_content_length_check` CHECK (CHAR_LENGTH(`content`) <= 2000),
  CONSTRAINT `conversation_messages_corrections_array_check` CHECK (JSON_TYPE(`corrections`) = 'ARRAY'),
  CONSTRAINT `conversation_messages_conversation_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversation_messages_user_fk` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE,
  INDEX `conversation_messages_conversation_created_idx` (`conversation_id`, `created_at`, `id`),
  INDEX `conversation_messages_user_created_idx` (`user_id`, `created_at`),
  INDEX `conversation_messages_memory_request_idx` (`user_id`, `conversation_id`, `request_id`, `role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mistakes` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `wrong_sentence` TEXT NOT NULL,
  `correct_sentence` TEXT NOT NULL,
  `explanation` TEXT NOT NULL,
  `category` VARCHAR(32) NOT NULL,
  `source_message_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `correction_index` INT NULL,
  `dismissed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `mistakes_pk` PRIMARY KEY (`id`),
  -- NULL source/index values remain available for manual and legacy entries.
  CONSTRAINT `mistakes_source_message_correction_unique` UNIQUE (`source_message_id`, `correction_index`),
  CONSTRAINT `mistakes_user_fk` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mistakes_source_message_fk` FOREIGN KEY (`source_message_id`) REFERENCES `conversation_messages` (`id`) ON DELETE SET NULL,
  INDEX `mistakes_user_category_idx` (`user_id`, `category`),
  INDEX `mistakes_user_created_at_idx` (`user_id`, `created_at`),
  INDEX `mistakes_user_dismissed_idx` (`user_id`, `dismissed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `practice_logs` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `activity_type` VARCHAR(64) NOT NULL,
  `duration` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `practice_logs_pk` PRIMARY KEY (`id`),
  CONSTRAINT `practice_logs_duration_check` CHECK (`duration` > 0),
  CONSTRAINT `practice_logs_user_fk` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE,
  INDEX `practice_logs_user_created_at_idx` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `learning_memory` (
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `schema_version` INT NOT NULL DEFAULT 1,
  `as_of` DATE NOT NULL,
  `snapshot` JSON NOT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `learning_memory_pk` PRIMARY KEY (`user_id`),
  CONSTRAINT `learning_memory_schema_version_check` CHECK (`schema_version` = 1),
  CONSTRAINT `learning_memory_snapshot_object_check` CHECK (JSON_TYPE(`snapshot`) = 'OBJECT'),
  CONSTRAINT `learning_memory_snapshot_size_check` CHECK (OCTET_LENGTH(`snapshot`) <= 12000),
  CONSTRAINT `learning_memory_user_fk` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admin_audit_logs` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `admin_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `target_user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `action` ENUM('user_approved','user_rejected','user_suspended','user_reactivated','user_updated') NOT NULL,
  `metadata` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `admin_audit_logs_pk` PRIMARY KEY (`id`),
  CONSTRAINT `admin_audit_logs_metadata_object_check` CHECK (JSON_TYPE(`metadata`) = 'OBJECT'),
  CONSTRAINT `admin_audit_logs_metadata_size_check` CHECK (OCTET_LENGTH(`metadata`) <= 4096),
  CONSTRAINT `admin_audit_logs_admin_user_fk` FOREIGN KEY (`admin_user_id`) REFERENCES `app_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `admin_audit_logs_target_user_fk` FOREIGN KEY (`target_user_id`) REFERENCES `app_users` (`id`) ON DELETE SET NULL,
  INDEX `admin_audit_logs_created_idx` (`created_at`, `id`),
  INDEX `admin_audit_logs_target_idx` (`target_user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
