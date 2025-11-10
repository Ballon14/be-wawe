CREATE TABLE IF NOT EXISTS `open_trips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama_trip` varchar(255) NOT NULL,
  `tanggal_berangkat` date NOT NULL,
  `durasi` int(11) NOT NULL,
  `kuota` int(11) NOT NULL,
  `harga_per_orang` int(11) NOT NULL,
  `fasilitas` text DEFAULT NULL,
  `itinerary` text DEFAULT NULL,
  `dokumentasi` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `dilaksanakan` tinyint(1) DEFAULT 0 COMMENT '0 = belum, 1 = sudah dilaksanakan',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



