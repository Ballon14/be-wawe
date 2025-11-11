-- Migration: Tambahkan index tambahan untuk optimasi query chat

ALTER TABLE `chat_messages` 
ADD INDEX IF NOT EXISTS `idx_created_at_role` (`created_at`, `role`),
ADD INDEX IF NOT EXISTS `idx_id_created` (`id`, `created_at`);









