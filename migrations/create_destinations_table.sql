-- Migration: Buat tabel destinations
-- Tabel ini menampung data destinasi wisata

CREATE TABLE IF NOT EXISTS destinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_destinasi VARCHAR(255) NOT NULL COMMENT 'Nama destinasi wisata',
    lokasi VARCHAR(255) NULL COMMENT 'Lokasi destinasi',
    ketinggian VARCHAR(100) NULL COMMENT 'Ketinggian destinasi (dalam meter atau feet)',
    kesulitan VARCHAR(50) NULL COMMENT 'Level kesulitan (mudah, sedang, sulit)',
    durasi VARCHAR(100) NULL COMMENT 'Durasi perjalanan atau estimasi waktu',
    deskripsi TEXT NULL COMMENT 'Deskripsi lengkap destinasi',
    jalur_pendakian JSON NULL COMMENT 'Array JSON jalur pendakian yang tersedia',
    fasilitas JSON NULL COMMENT 'Array JSON fasilitas yang tersedia',
    tips JSON NULL COMMENT 'Array JSON tips dan saran',
    gambar VARCHAR(500) NULL COMMENT 'URL atau path gambar destinasi',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pembuatan record',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu update record terakhir',
    INDEX idx_nama_destinasi (nama_destinasi),
    INDEX idx_lokasi (lokasi),
    INDEX idx_kesulitan (kesulitan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

