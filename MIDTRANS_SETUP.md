# Konfigurasi Midtrans Payment Gateway

## Environment Variables yang Diperlukan

Tambahkan variabel berikut ke file `.env` di folder `be-wawe`:

```env
# Midtrans Configuration
MIDTRANS_IS_PRODUCTION=false  # true untuk production, false untuk sandbox
MIDTRANS_SERVER_KEY=your_server_key_here
MIDTRANS_CLIENT_KEY=your_client_key_here

# Frontend URL untuk callback
FRONTEND_URL=http://localhost:5173
```

## Cara Mendapatkan Midtrans Credentials

### 1. Daftar/Login ke Midtrans Dashboard
- Kunjungi: https://dashboard.midtrans.com/
- Login atau daftar akun baru

### 2. Untuk Development/Testing (Sandbox)
- Setelah login, pilih **Sandbox** mode
- Buka menu **Settings** > **Access Keys**
- Copy **Server Key** dan **Client Key**
- Set `MIDTRANS_IS_PRODUCTION=false` di `.env`

### 3. Untuk Production
- Setelah aplikasi siap, pilih **Production** mode
- Buka menu **Settings** > **Access Keys**
- Copy **Server Key** dan **Client Key** (berbeda dengan sandbox)
- Set `MIDTRANS_IS_PRODUCTION=true` di `.env`

## Testing dengan Sandbox

Untuk testing, gunakan kartu kredit test berikut:
- **Card Number**: 4811 1111 1111 1114
- **CVV**: 123
- **Expiry**: Bulan/tahun apapun di masa depan (contoh: 12/25)
- **OTP**: 112233 (untuk 3D Secure)

## Troubleshooting

### Error: "Payment gateway not configured"
- Pastikan `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` sudah di-set di `.env`
- Restart server setelah mengubah `.env`

### Error: "Failed to create payment transaction"
- Periksa console server untuk detail error
- Pastikan credentials benar (sandbox vs production)
- Pastikan koneksi internet tersedia untuk menghubungi Midtrans API

### Error: "Invalid payment amount"
- Pastikan `harga_per_orang` dan `jumlah_peserta` valid
- Total amount harus > 0

## Webhook Configuration

Setelah deploy ke production, konfigurasi webhook URL di Midtrans Dashboard:
- **Webhook URL**: `https://your-domain.com/api/payment/webhook`
- Buka **Settings** > **Configuration** > **Payment Notification**
- Masukkan URL webhook di atas

