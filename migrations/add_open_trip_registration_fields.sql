ALTER TABLE `open_trip_registrations`
ADD COLUMN IF NOT EXISTS `alamat` TEXT NULL AFTER `nomor_hp`,
ADD COLUMN IF NOT EXISTS `kontak_darurat_nama` VARCHAR(255) NULL AFTER `alamat`,
ADD COLUMN IF NOT EXISTS `kontak_darurat_nomor` VARCHAR(30) NULL AFTER `kontak_darurat_nama`,
ADD COLUMN IF NOT EXISTS `riwayat_penyakit` TEXT NULL AFTER `kontak_darurat_nomor`,
ADD COLUMN IF NOT EXISTS `kondisi_fit` TINYINT(1) DEFAULT 0 AFTER `riwayat_penyakit`;




