-- Migration: Tambah field dilaksanakan di tabel open_trips dan private_trips
-- Field ini menandai apakah trip sudah dilaksanakan (1) atau belum (0)

ALTER TABLE open_trips 
ADD COLUMN dilaksanakan TINYINT(1) DEFAULT 0 COMMENT '0 = belum, 1 = sudah dilaksanakan';

ALTER TABLE private_trips 
ADD COLUMN dilaksanakan TINYINT(1) DEFAULT 0 COMMENT '0 = belum, 1 = sudah dilaksanakan';

