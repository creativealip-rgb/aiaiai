# Credential Encryption Key Rotation

`CREDENTIALS_ENCRYPTION_KEY` dipakai untuk encrypt/decrypt stok kredensial akun.

## Warning
- Jika key hilang tanpa proses re-encrypt, data kredensial lama tidak bisa didecrypt.
- Lakukan di maintenance window.

## Strategi Aman
1. Backup DB penuh dulu.
2. Siapkan key baru (64 hex chars).
3. Jalankan script migrasi re-encrypt:
   - decrypt pakai key lama
   - encrypt ulang pakai key baru
4. Verifikasi random sampling hasil decrypt.
5. Update env production dengan key baru.
6. Restart app.

## Checklist
- [ ] Backup sukses
- [ ] Script re-encrypt selesai tanpa error
- [ ] Verifikasi minimal 20 data acak
- [ ] Deploy env baru
- [ ] Monitoring error decrypt 24 jam

