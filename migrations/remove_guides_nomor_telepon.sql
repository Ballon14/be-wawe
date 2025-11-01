-- Migration: Hapus kolom nomor_telepon dari tabel guides
-- Kolom ini tidak lagi digunakan

ALTER TABLE guides 
DROP COLUMN nomor_telepon;

