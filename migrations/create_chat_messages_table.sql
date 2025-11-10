CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL COMMENT 'Username pengirim pesan',
  `message` text NOT NULL COMMENT 'Isi pesan',
  `role` enum('admin','user') DEFAULT 'user' COMMENT 'Role pengirim',
  `is_read` tinyint(1) DEFAULT 0 COMMENT 'Status dibaca (0 = belum, 1 = sudah)',
  `created_at` timestamp NULL DEFAULT current_timestamp() COMMENT 'Waktu pesan dikirim',
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at_role` (`created_at`, `role`),
  KEY `idx_id_created` (`id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

