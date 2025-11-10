CREATE TABLE IF NOT EXISTS `history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `role` enum('admin','user') NOT NULL,
  `action` varchar(15) NOT NULL,
  `trip_type` varchar(20) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `request_body` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



