-- Migration: Tambahkan kolom email, nomor_hp, dan alamat ke tabel users

ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `email` VARCHAR(255) NULL COMMENT 'Email pengguna' AFTER `username`,
ADD COLUMN IF NOT EXISTS `nomor_hp` VARCHAR(20) NULL COMMENT 'Nomor HP pengguna' AFTER `email`,
ADD COLUMN IF NOT EXISTS `alamat` TEXT NULL COMMENT 'Alamat pengguna' AFTER `nomor_hp`;









