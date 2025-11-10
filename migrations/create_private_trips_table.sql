CREATE TABLE IF NOT EXISTS `private_trips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `destinasi` varchar(255) NOT NULL,
  `min_peserta` int(11) NOT NULL,
  `harga_paket` int(11) NOT NULL,
  `paket_pilihan` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `custom_form` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `estimasi_biaya` int(11) DEFAULT NULL,
  `dokumentasi` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `dilaksanakan` tinyint(1) DEFAULT 0 COMMENT '0 = belum, 1 = sudah dilaksanakan',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



