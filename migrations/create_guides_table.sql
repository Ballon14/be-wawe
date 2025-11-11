-- Migration: Buat tabel guides
-- Tabel ini menampung data pemandu wisata (guide)

CREATE TABLE IF NOT EXISTS guides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL COMMENT 'Nama lengkap guide',
    email VARCHAR(255) NULL COMMENT 'Email guide',
    alamat TEXT NULL COMMENT 'Alamat guide',
    pengalaman VARCHAR(255) NULL COMMENT 'Pengalaman guide (misal: 5 tahun)',
    spesialisasi JSON NULL COMMENT 'Array JSON destinasi atau lokasi yang dikuasai',
    rating DECIMAL(3,2) NULL COMMENT 'Rating guide (0.00 - 5.00)',
    deskripsi TEXT NULL COMMENT 'Deskripsi lengkap guide',
    foto VARCHAR(500) NULL COMMENT 'URL atau path foto guide',
    sertifikat JSON NULL COMMENT 'Array JSON sertifikat atau lisensi yang dimiliki',
    status VARCHAR(20) DEFAULT 'aktif' COMMENT 'Status guide (aktif, tidak aktif)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pembuatan record',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Waktu update record terakhir',
    INDEX idx_nama (nama),
    INDEX idx_status (status),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

