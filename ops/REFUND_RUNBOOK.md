# Refund Manual Runbook

## Tujuan
Panduan operasional saat refund tidak bisa diproses otomatis dari panel.

## Prasyarat
- Admin login ke `/admin/orders`
- Order dalam status yang valid untuk refund (`paid|processing|partial_delivered|delivered`)
- Bukti alasan refund terdokumentasi (ticket/chat)

## Langkah
1. Buka detail order dari `/admin/orders`.
2. Verifikasi:
   - Nomor order
   - Nominal
   - Riwayat status
   - Bukti kendala customer
3. Jalankan aksi **Refund** di panel admin.
4. Konfirmasi perubahan:
   - `orders.status` menjadi `refunded`
   - timestamp `refunded_at` terisi
   - notifikasi user terkirim
5. Jika aksi panel gagal:
   - Cek log app (`docker logs` / compose logs)
   - Catat error ID/time untuk audit

## Post-Action
- Tambahkan catatan internal:
  - siapa yang approve
  - alasan refund
  - waktu eksekusi
- Follow-up ke customer (email/WhatsApp) bila dibutuhkan.

