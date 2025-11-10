# Security Measures - Kawan Hiking

## Keamanan yang Diterapkan

### 1. **Rate Limiting**
- **Auth endpoints**: 5 request per 15 menit (mencegah brute force)
- **Chat**: 10 pesan per menit (mencegah spam)
- **General API**: 100 request per 15 menit

### 2. **Input Validation & Sanitization**
- Validasi semua input dengan `express-validator`
- Sanitization untuk mencegah XSS (Cross-Site Scripting)
- Validasi format email, nomor HP, dll
- Password strength requirements:
  - Minimum 8 karakter
  - Harus mengandung huruf besar, huruf kecil, dan angka

### 3. **Security Headers (Helmet)**
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Dan security headers lainnya

### 4. **CORS Protection**
- Hanya allow origin yang diizinkan
- Credentials: true (untuk cookies/JWT)
- Methods dan headers yang diizinkan dibatasi

### 5. **File Upload Security**
- Validasi tipe file (hanya gambar: jpeg, jpg, png, gif, webp)
- Maximum file size: 5MB
- Sanitize filename
- Validasi MIME type

### 6. **SQL Injection Prevention**
- Semua query menggunakan prepared statements (parameterized queries)
- Tidak ada string concatenation dalam query

### 7. **JWT Security**
- Token expiration: 12 jam
- Issuer validation
- Token verification dengan error handling yang tepat

### 8. **Password Security**
- Bcrypt dengan 12 salt rounds (dari 10)
- Password tidak pernah disimpan dalam plain text
- Password strength validation

### 9. **Error Handling**
- Tidak expose informasi sensitif di production
- Error messages yang generic untuk user
- Detailed error hanya di development mode

### 10. **Input Length Limits**
- Username: max 50 karakter
- Email: max 255 karakter
- Nomor HP: max 20 karakter
- Alamat: max 500 karakter
- Chat message: max 1000 karakter

## Best Practices

### Environment Variables
Pastikan file `.env` tidak di-commit ke repository:
- `DB_PASSWORD` - Password database
- `JWT_SECRET` - Secret key untuk JWT (harus kuat dan random)
- `FRONTEND_URL` - URL frontend yang diizinkan

### JWT Secret
Gunakan secret yang kuat:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Database User
- Gunakan user database dengan privilege minimal
- Jangan gunakan root user untuk aplikasi
- Grant hanya permission yang diperlukan

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Gunakan HTTPS
- [ ] Update JWT_SECRET dengan nilai yang kuat
- [ ] Review dan update CORS origin
- [ ] Enable database connection encryption
- [ ] Setup firewall rules
- [ ] Regular security updates
- [ ] Monitor error logs
- [ ] Backup database secara rutin

## Testing Security

### Test Rate Limiting
```bash
# Test auth rate limit (harus gagal setelah 5 request)
for i in {1..6}; do curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'; done
```

### Test Input Validation
```bash
# Test XSS attempt
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"username":"<script>alert(1)</script>","password":"Test1234"}'
```

## Monitoring

Monitor untuk:
- Failed login attempts
- Rate limit violations
- Unusual request patterns
- Error rates
- Database query performance



