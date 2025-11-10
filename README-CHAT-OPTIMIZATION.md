# Optimasi Live Chat - Database

## Optimasi yang Diterapkan

### 1. **Limit Pesan yang Diambil**
- Hanya mengambil 30 pesan terakhir (default)
- Maximum 50 pesan per request
- Mengurangi beban query database

### 2. **Incremental Fetch**
- Hanya mengambil pesan baru setelah ID terakhir
- Mengurangi transfer data yang tidak perlu
- Menggunakan parameter `since_id` untuk fetch incremental

### 3. **Auto Cleanup Pesan Lama**
- Pesan yang lebih dari 30 hari otomatis dihapus saat ada pesan baru
- Mencegah database membesar tanpa batas
- Script cleanup manual: `node routes/chat-cleanup.js`

### 4. **Optimasi Polling Interval**
- Polling pesan: 5 detik (dari 2 detik)
- Polling unread count: 10 detik (dari 5 detik)
- Mengurangi jumlah request ke database

### 5. **Limit Panjang Pesan**
- Maximum 1000 karakter per pesan
- Mencegah pesan terlalu panjang yang membebani database

### 6. **Index Database**
- Index tambahan untuk query yang lebih cepat:
  - `idx_created_at_role` - untuk filter berdasarkan waktu dan role
  - `idx_id_created` - untuk incremental fetch

## Cara Menjalankan Cleanup Manual

```bash
cd kawan-hiking/be-wawe
node routes/chat-cleanup.js
```

## Menjadwalkan Cleanup Otomatis (Cron)

Tambahkan ke crontab untuk cleanup harian:

```bash
# Cleanup setiap hari jam 2 pagi
0 2 * * * cd /path/to/kawan-hiking/be-wawe && node routes/chat-cleanup.js
```

## Monitoring

Untuk memantau ukuran tabel chat_messages:

```sql
SELECT 
    COUNT(*) as total_messages,
    MIN(created_at) as oldest_message,
    MAX(created_at) as newest_message
FROM chat_messages;
```



