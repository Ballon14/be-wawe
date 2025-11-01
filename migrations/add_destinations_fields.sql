-- Migration: Tambah field tambahan di tabel destinations
-- Field ini menambahkan ketinggian, kesulitan, durasi, jalur_pendakian, dan tips
-- Catatan: Jika kolom sudah ada, query ini akan error. Hapus bagian yang sudah ada.

-- Tambah ketinggian
ALTER TABLE destinations 
ADD COLUMN ketinggian VARCHAR(100) NULL COMMENT 'Ketinggian destinasi (dalam meter atau feet)' AFTER lokasi;

-- Tambah kesulitan
ALTER TABLE destinations 
ADD COLUMN kesulitan VARCHAR(50) NULL COMMENT 'Level kesulitan (mudah, sedang, sulit)' AFTER ketinggian;

-- Tambah durasi
ALTER TABLE destinations 
ADD COLUMN durasi VARCHAR(100) NULL COMMENT 'Durasi perjalanan atau estimasi waktu' AFTER kesulitan;

-- Tambah jalur_pendakian
ALTER TABLE destinations 
ADD COLUMN jalur_pendakian JSON NULL COMMENT 'Array JSON jalur pendakian yang tersedia' AFTER deskripsi;

-- Tambah tips
ALTER TABLE destinations 
ADD COLUMN tips JSON NULL COMMENT 'Array JSON tips dan saran' AFTER fasilitas;

-- Tambah index untuk kesulitan
CREATE INDEX idx_kesulitan ON destinations(kesulitan);

