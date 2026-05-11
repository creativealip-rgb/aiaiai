# Implementation Plan — AI3 (Marketplace Akun & Jasa Digital)

> **Catatan agent**: Next.js versi di project ini (16.2.6) punya breaking changes vs versi
> sebelumnya. Sebelum menulis kode Next.js apapun, baca dulu panduan relevan di
> `node_modules/next/dist/docs/` (tersedia setelah `npm install`). Lihat juga `AGENTS.md`.

---

## 1. Ringkasan Produk

Website marketplace untuk menjual **akun digital** (Netflix, Spotify, Disney+, Canva, ChatGPT, dll.) dan **jasa** (top-up, joki, desain, dll.) dengan 2 role utama:

- **Member (Customer)** — browsing produk, order, bayar, terima kredensial akun otomatis / manual.
- **Admin** — kelola produk, stok akun, order, pembayaran, user, laporan.

**Nama brand (sementara)**: `AI3` (sudah tertanam di `.env.example`, `docker-compose.yml`, dan `package.json`).

---

## 2. Keputusan Final

### 2.1 Dari state project (sudah ada di repo)

| Area                  | Keputusan                                        | Sumber               |
| --------------------- | ------------------------------------------------ | -------------------- |
| Framework             | Next.js 16.2.6 (App Router) + React 19.2.4 + TS  | `package.json`       |
| Styling               | TailwindCSS v4 (via `@tailwindcss/postcss`)      | `package.json`       |
| ORM                   | Drizzle ORM (postgres dialect)                   | `drizzle.config.ts`  |
| Database              | PostgreSQL 16 (local: docker-compose)            | `docker-compose.yml` |
| DB admin UI           | **Drizzle Studio** (`npm run db:studio`)         | pilihan team         |
| Payment gateway       | **Mayar** (Headless API v1)                      | `.env.example`       |
| Email                 | Resend                                           | `.env.example`       |
| Storage               | Local default, pluggable ke Supabase / R2        | `.env.example`       |
| Credential encryption | AES-256-GCM, key di `CREDENTIALS_ENCRYPTION_KEY` | `.env.example`       |
| Schema location       | `src/db/schema.ts`                               | `drizzle.config.ts`  |
| Migrations location   | `./drizzle`                                      | `drizzle.config.ts`  |
| Brand name            | **AI3** (final)                                  | Semua file           |

### 2.2 Dari konfirmasi user

| Area                 | Keputusan                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth library         | **Better-Auth**                                                                                                                                              |
| OAuth Google         | **Masuk MVP** (Fase 1)                                                                                                                                       |
| Wallet / saldo       | **Masuk MVP** (Fase 6)                                                                                                                                       |
| Guest checkout       | **Diizinkan** — data pembeli disimpan sebagai _shadow user_; kalau kemudian login/register dengan email yang sama, order otomatis ter-claim ke akun tersebut |
| Deployment target    | **Self-host Docker di VPS** (produksi). MVP dikembangkan **lokal dulu** via `docker-compose`                                                                 |
| Kategori awal (seed) | **Hiburan**, **AI**, **Produktifitas**                                                                                                                       |

---

## 3. Tech Stack (Final)

| Layer          | Pilihan                                                                                                | Alasan                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Framework      | **Next.js 16 (App Router) + TS + React 19**                                                            | Full-stack, Server Components, Server Actions                        |
| UI             | **Tailwind v4 + shadcn/ui**                                                                            | Cepat, modern, accessible                                            |
| Database       | **PostgreSQL 16** (docker-compose lokal, Neon/Supabase produksi)                                       | Relational, gratis tier memadai                                      |
| ORM            | **Drizzle ORM + drizzle-kit**                                                                          | Type-safe, ringan, migration-friendly                                |
| Auth           | **Better-Auth**                                                                                        | Modern, built-in email + OAuth, session server-side, Drizzle adapter |
| Payment        | **Mayar Headless API v1**                                                                              | QRIS, VA, e-wallet lokal; sudah siap di `.env`                       |
| Storage        | **Local (dev) → Supabase Storage / R2 (prod)**                                                         | Upload gambar produk                                                 |
| Email          | **Resend** + **react-email**                                                                           | Kirim invoice, kredensial, notifikasi                                |
| State          | **Zustand** + **TanStack Query v5**                                                                    | Cart & data fetching                                                 |
| Validation     | **Zod**                                                                                                | Schema validation end-to-end                                         |
| Forms          | **react-hook-form** + `@hookform/resolvers/zod`                                                        | Form ergonomis                                                       |
| Tables         | **@tanstack/react-table**                                                                              | Admin tables                                                         |
| Chart          | **Recharts**                                                                                           | Dashboard admin                                                      |
| Date           | **date-fns**                                                                                           | Format ringan                                                        |
| Encryption     | Node `crypto` (AES-256-GCM)                                                                            | Enkripsi credential di DB                                            |
| Rate limit     | **@upstash/ratelimit** + Redis (Upstash) atau in-memory dev                                            | Anti brute force, anti spam checkout                                 |
| Testing        | **Vitest** + **Playwright**                                                                            | Unit + E2E                                                           |
| Lint/format    | **ESLint 9** + **Prettier** + **Husky** + **lint-staged**                                              | Konsistensi kode                                                     |
| Logger         | **Pino**                                                                                               | Structured logging                                                   |
| Error tracking | **Sentry** (prod)                                                                                      | Monitoring                                                           |
| Deployment     | **Docker + VPS** (Caddy/Traefik + Let's Encrypt) — dev lokal pakai `docker-compose.yml` yang sudah ada | Zero-vendor, kontrol penuh                                           |

---

## 4. Role & Permission

### Guest (tanpa login)

- Lihat katalog, tambah ke cart.
- **Checkout**: diizinkan. Sistem akan membuat _shadow user_ (record `users` dengan `password_hash = NULL` dan `email_verified_at = NULL`) berdasarkan email yang diisi, lalu order di-link ke user tersebut.
- Lihat status order via link unik yang dikirim ke email (magic link bertoken + rate-limited).
- **Belum** bisa lihat histori banyak order, review, wallet.

### Member

- Register / Login (email + Google OAuth).
- Saat register / pertama login dengan email yang pernah dipakai guest → otomatis **claim** shadow user tersebut (set `password_hash`, `email_verified_at`), semua order lama jadi miliknya.
- Lihat katalog produk & detail.
- Tambah ke cart, checkout.
- Bayar via Mayar (QRIS / VA / e-wallet).
- Lihat riwayat order & kredensial akun yang dibeli.
- Review produk (hanya produk yang sudah di-deliver).
- Top-up saldo & pakai di checkout.
- Request refund (dengan alasan).
- WhatsApp float untuk CS.

### Admin

- Dashboard (statistik penjualan, revenue, user aktif, stok menipis)
- CRUD kategori, produk, varian
- Manajemen stok akun (bulk import via CSV, lihat sisa stok)
- Kelola order: konfirmasi, deliver manual, refund, cancel
- Kelola user: ban/unban, verifikasi, reset password, ubah role
- Verifikasi & rekap pembayaran
- Kelola voucher / promo
- Laporan penjualan (export Excel/CSV)
- Pengaturan site (logo, kontak, banner, TOS)
- Audit log (lihat aksi admin)

### Role matrix (RBAC)

| Action                         |       Guest       | Member |      Admin       |
| ------------------------------ | :---------------: | :----: | :--------------: |
| Lihat katalog                  |        ✅         |   ✅   |        ✅        |
| Add to cart                    |        ✅         |   ✅   |        ✅        |
| Checkout                       | ✅ (shadow user)  |   ✅   |        ✅        |
| Lihat kredensial order sendiri | ✅ via magic link |   ✅   |        ✅        |
| Review / top-up / wallet       |        ❌         |   ✅   |        ✅        |
| Admin panel                    |        ❌         |   ❌   |        ✅        |
| Ubah role user                 |        ❌         |   ❌   | ✅ (super admin) |

> Untuk MVP, cukup 2 role (+ guest flow). Bila nanti butuh super-admin vs admin biasa → tambah `admin_level`.

---

## 5. Database Schema (Final Draft)

Semua tabel memiliki:

- `id`: `uuid` (default `gen_random_uuid()`) atau `bigserial` — **pilih uuid** untuk menghindari ID guessing.
- `created_at`, `updated_at`: `timestamptz` default `now()`.
- Soft-delete: kolom `deleted_at timestamptz null` di tabel bernilai tinggi (products, users).

### 5.1 Tabel

```
users
  id (uuid, pk)
  email (citext, unique, not null)
  password_hash (text, nullable)     -- null = guest (belum register) atau OAuth-only
  name (text)
  phone (text)
  role (enum: member|admin, default 'member')
  balance (numeric(14,2), default 0) -- saldo IDR
  is_banned (boolean, default false)
  email_verified_at (timestamptz)    -- null pada guest
  claimed_at (timestamptz)           -- timestamp guest → member (diset saat register/login pertama)
  last_login_at (timestamptz)
  created_at, updated_at, deleted_at
  INDEX (email), (role)
  -- Catatan: guest_user = password_hash IS NULL AND email_verified_at IS NULL AND claimed_at IS NULL

sessions                              -- Better-Auth session
  id, user_id, expires_at, token, ip, user_agent, created_at

accounts                              -- Better-Auth OAuth link (Google, dst.)
  id, user_id, provider, provider_account_id, ...

verification_tokens                   -- email verify & reset password
  id, user_id, token, type, expires_at, used_at

categories
  id, name, slug (unique), icon, description, sort_order,
  is_active (bool), created_at, updated_at
  INDEX (slug)

products
  id, category_id (fk), name, slug (unique), description (text),
  thumbnail_url, images (jsonb - array of url),
  type (enum: account|service),
  base_price (numeric(14,2)),         -- base; varian bisa override
  discount_price (numeric(14,2), nullable),
  is_active (bool), is_featured (bool),
  delivery_type (enum: auto|manual),
  warranty_days (int default 0),
  meta (jsonb),                       -- extra attributes (per tipe produk)
  sold_count (int default 0),         -- denormalized untuk sorting
  rating_avg (numeric(3,2) default 0),
  rating_count (int default 0),
  created_at, updated_at, deleted_at
  INDEX (category_id), (slug), (is_active, is_featured), (type)

product_variants                      -- mis. "1 bulan private", "3 bulan sharing"
  id, product_id (fk, on delete cascade),
  name, sku (unique), price (numeric),
  stock_mode (enum: tracked|unlimited),
  description, sort_order, is_active,
  created_at, updated_at
  INDEX (product_id, is_active)

account_stocks                        -- inventori kredensial (type=account)
  id, product_id (fk), variant_id (fk),
  credential_ciphertext (bytea),      -- AES-256-GCM encrypted JSON
  credential_iv (bytea),              -- initialization vector
  credential_tag (bytea),             -- auth tag GCM
  label (text),                       -- profile name / slot label (plaintext ok)
  notes (text),                       -- internal notes (plaintext, bukan cred)
  status (enum: available|reserved|sold|disabled),
  reserved_until (timestamptz),       -- hold sementara saat checkout
  sold_to_order_item_id (uuid, fk),
  created_at, updated_at
  INDEX (product_id, variant_id, status), (status, reserved_until)

orders
  id, order_number (text, unique),    -- human-friendly, ex: AI3-2026-0001
  user_id (fk, not null),             -- selalu terisi; guest → shadow user row
  is_guest_order (bool, default false), -- true saat order dibuat tanpa session (untuk analytics)
  status (enum: pending|paid|processing|delivered|partial_delivered|cancelled|refunded|failed),
  subtotal, discount, total (numeric),
  voucher_id (fk, nullable),
  payment_method (text),              -- 'mayar', 'wallet', 'mixed'
  wallet_used (numeric, default 0),
  notes (text),
  expires_at (timestamptz),           -- pending expiry (~1 jam)
  paid_at, delivered_at, cancelled_at, refunded_at,
  created_at, updated_at
  INDEX (user_id, status), (order_number), (status, expires_at)

order_access_tokens                   -- magic link untuk guest lihat order
  id, order_id (fk, cascade),
  token_hash (text, unique),          -- simpan hash, bukan plaintext
  expires_at (timestamptz),
  used_count (int default 0),
  last_used_at (timestamptz),
  created_at
  INDEX (order_id), (token_hash)

order_items
  id, order_id (fk, cascade), product_id, variant_id,
  qty (int), unit_price (numeric), line_total (numeric),
  product_snapshot (jsonb),           -- nama/meta produk saat order (immutable)
  account_stock_id (fk, nullable),    -- null kalau service
  delivered_at, delivery_notes (text),
  created_at, updated_at

payments
  id, order_id (fk), user_id (fk),
  gateway (text),                     -- 'mayar' | 'wallet'
  gateway_ref (text, unique),         -- transaction id dari gateway
  amount (numeric), fee (numeric default 0),
  status (enum: pending|paid|failed|expired|refunded),
  method (text),                      -- qris, bank_transfer, ewallet, etc
  paid_at, expired_at,
  raw_request (jsonb), raw_response (jsonb),
  webhook_received_at,
  created_at, updated_at
  INDEX (order_id), (gateway_ref), (status)

payment_webhook_events                -- idempotency & audit
  id, gateway, event_id (unique), event_type,
  payload (jsonb), processed_at, error, created_at

vouchers
  id, code (unique citext), type (enum: percent|fixed),
  value (numeric), min_spend (numeric),
  max_uses (int), used_count (int default 0),
  max_uses_per_user (int default 1),
  starts_at, expires_at,
  is_active, created_at, updated_at

voucher_redemptions
  id, voucher_id, user_id, order_id, amount_discounted, created_at
  UNIQUE (voucher_id, order_id)

reviews
  id, user_id (fk), product_id (fk), order_item_id (fk, unique),
  rating (int 1..5, check), comment, is_hidden (bool), created_at, updated_at
  INDEX (product_id)

wallet_transactions
  id, user_id (fk), type (enum: topup|purchase|refund|adjustment),
  amount (numeric, signed: + masuk / - keluar),
  balance_after (numeric),            -- snapshot untuk audit
  ref_type (text), ref_id (uuid),     -- polymorphic (order/payment)
  description (text), created_at
  INDEX (user_id, created_at)

notifications
  id, user_id (fk), type, title, message, link_url,
  is_read (bool default false), created_at
  INDEX (user_id, is_read, created_at)

site_settings
  key (pk), value (jsonb), updated_at

audit_logs
  id, actor_id (user fk), action, entity_type, entity_id,
  diff (jsonb), ip, user_agent, created_at
  INDEX (actor_id, created_at), (entity_type, entity_id)

rate_limit_buckets                    -- kalau tidak pakai Upstash
  key (pk), count, reset_at
```

### 5.2 Aturan integritas penting

- `account_stocks.status` transisi: `available → reserved → sold` (atomik via transaction).
- `orders.status` transisi:
  - `pending → paid` (webhook success)
  - `pending → cancelled | failed` (expiry / webhook failed)
  - `paid → processing → delivered`
  - `paid → refunded` (admin action)
- **Tidak pernah** overwrite `product_snapshot` / `price_snapshot` di `order_items`.
- Enkripsi `account_stocks` menggunakan AES-256-GCM. Key harus dari env, bukan hardcode.
- Seluruh mutasi saldo `balance` user **wajib** membuat row di `wallet_transactions` — single source of truth.

---

## 6. Struktur Halaman / Route

### Public

- `/` — Landing (hero, kategori, produk populer, testimoni)
- `/products` — Katalog + filter kategori & harga + search
- `/products/[slug]` — Detail produk & varian
- `/c/[category]` — Produk per kategori
- `/cart` — Keranjang
- `/checkout` — Form checkout (guest diperbolehkan; email wajib)
- `/order/[orderNumber]` — Status order (login) — atau via magic link `?token=<opaque>` (guest)
- `/login`, `/register`, `/forgot-password`, `/reset-password/[token]`, `/verify/[token]`
- `/about`, `/contact`, `/tos`, `/privacy`, `/refund-policy`

### Member (butuh login)

- `/dashboard` — Ringkasan order & saldo
- `/dashboard/orders` — Riwayat order
- `/dashboard/orders/[id]` — Detail + kredensial (hanya bila sudah delivered)
- `/dashboard/wallet` — Saldo & riwayat transaksi + top-up
- `/dashboard/profile` — Edit profil & ganti password
- `/dashboard/reviews` — Review yang bisa ditulis

### Admin (role=admin)

- `/admin` — Dashboard statistik
- `/admin/products`, `/admin/products/new`, `/admin/products/[id]`
- `/admin/stocks` — Inventori akun (import CSV, lihat status)
- `/admin/categories`
- `/admin/orders`, `/admin/orders/[id]` — Detail + aksi (deliver, refund, cancel)
- `/admin/users`, `/admin/users/[id]`
- `/admin/payments`
- `/admin/vouchers`
- `/admin/reports`
- `/admin/audit-log`
- `/admin/settings`

### API / Server

- `/api/webhooks/mayar` — Mayar payment webhook
- `/api/auth/*` — Better-Auth handler
- `/api/uploads` — Upload handler (admin only)

> Sebagian besar data-mutation pakai **Server Actions**, bukan API route, kecuali webhook.

---

## 7. Alur Utama

### 7.1 Pembelian (Auto Delivery — produk tipe `account`)

1. Member pilih produk → add to cart → checkout.
2. Sistem **cek stok** `account_stocks.status = available` untuk tiap item.
3. Create `orders` status `pending`, `expires_at = now() + 1 jam`.
4. Reserve stok: `UPDATE account_stocks SET status='reserved', reserved_until=now()+'1 hour'` untuk N row per variant. Dilakukan dalam 1 transaction. Bila kurang, return error "stok habis".
5. Create invoice via Mayar → redirect / popup.
6. Webhook Mayar masuk `/api/webhooks/mayar`:
   - Verifikasi signature / webhook token.
   - Idempotency check via `payment_webhook_events.event_id`.
   - Update `payments.status = paid`, `orders.status = paid`.
   - Finalize stok: `reserved → sold`, set `sold_to_order_item_id`.
   - Update `orders.status = delivered`, `delivered_at = now()`.
   - Enqueue email kredensial (via Resend).
7. Member lihat kredensial di `/dashboard/orders/[id]` (decrypt on-demand di server).

**Expiry worker** (cron/route handler setiap 5 menit):

- Cari order `pending` dengan `expires_at < now()` → cancel order & release reserved stocks.

### 7.2 Pembelian (Manual / Jasa — produk tipe `service`)

1. Sama sampai `paid`.
2. `orders.status` diset `processing` (bukan `delivered`), muncul di `/admin/orders`.
3. Admin proses (top-up, desain, joki) → klik "mark delivered" + isi `delivery_notes` (bisa attach file link).
4. Member dapat email notifikasi.

### 7.3 Mixed cart (account + service)

- Order bisa berisi item auto + manual.
- Status `orders.status = partial_delivered` kalau item auto sudah kirim, service belum.
- Transisi final `delivered` saat semua item terkirim.

### 7.4 Refund

1. Member ajukan refund dari `/dashboard/orders/[id]` (dengan alasan) — hanya dalam `warranty_days` setelah delivery.
2. Status `orders.refund_requested = true` (flag), admin lihat di queue.
3. Admin review → approve / reject.
4. Approve:
   - Refund ke **saldo wallet** (lebih cepat, default). Create `wallet_transactions` type=`refund`.
   - Atau refund ke gateway (manual bank transfer dari admin bila perlu).
   - `orders.status = refunded`, `refunded_at = now()`.
   - Bila auto-delivery: mark `account_stocks.status = disabled` (tidak dijual ulang kecuali admin reset).

### 7.5 Wallet Top-up

1. Member input nominal → create payment ke Mayar.
2. Webhook paid → `wallet_transactions` type=`topup` → `users.balance += amount`.
3. Saat checkout, toggle "pakai saldo" — bisa parsial (sisanya bayar gateway).

### 7.6 Cart guest → login

- Cart guest di `localStorage` (via Zustand persist).
- Saat login/register, merge ke cart server-side (tabel opsional `cart_items` atau tetap client-side).
- **MVP**: cart cukup client-side, tidak perlu server.

### 7.7 Stok habis saat banyak user checkout bersamaan

- Pakai row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`) di transaction reserve.
- Atau manfaatkan `UPDATE ... WHERE status='available' RETURNING id` dengan `LIMIT N`.

### 7.8 Guest checkout & auto-claim

Prinsip: **setiap order selalu terikat ke satu `users.id`**. Guest tidak menghasilkan data lepas — mereka membuat "shadow user" yang nantinya bisa di-claim.

**Alur checkout guest:**

1. Guest isi form checkout (email, nama, phone wajib).
2. Server lookup `users` by email:
   - Jika **tidak ada**: `INSERT` row baru dengan `password_hash=NULL`, `email_verified_at=NULL`, `claimed_at=NULL`, nama & phone terisi.
   - Jika **ada & sudah claimed** (user terdaftar aktif): tampilkan pesan "Email ini sudah terdaftar, silakan login dulu" + tombol ke `/login?next=/checkout`. Order tidak dibuat dulu.
   - Jika **ada & masih shadow** (belum claimed): update nama & phone bila kosong, pakai user tersebut.
3. Create order seperti biasa (`user_id` = id user tersebut, `is_guest_order = true`).
4. Setelah paid, generate `order_access_tokens` (token opaque 32 byte, simpan hash-nya), kirim email berisi link `/{APP_URL}/order/{orderNumber}?token={token}` (TTL misal 30 hari, rate-limit view).
5. Guest akses link → server verify token hash → tampilkan status + kredensial.

**Alur claim saat register / login Google:**

1. User register dengan email X, password Y:
   - Lookup existing user email X.
   - Kalau shadow (`password_hash IS NULL AND claimed_at IS NULL`): set `password_hash = hash(Y)`, kirim verify email, saat verified set `email_verified_at` & `claimed_at = now()`. Semua order otomatis ter-link.
   - Kalau sudah claimed (password_hash ada): reject "email sudah terdaftar, silakan login".
2. Login Google dengan email X (pertama kali):
   - Kalau shadow: buat row `accounts` (OAuth link), set `claimed_at = now()`, `email_verified_at = now()` (Google sudah verifikasi). Order otomatis ter-link.
   - Kalau sudah claimed tanpa Google link: link akun Google ke user existing.

**Keamanan & edge case:**

- Guest token TTL: default 30 hari, auto-invalidate jika user akhirnya login (`claimed_at` diset) — paksa user lihat order dari dashboard saja.
- Rate-limit pengiriman magic link: max 3x per email per jam.
- Bila guest input email yang **sudah claimed** → **jangan** auto-login. Selalu paksa login manual (hindari takeover via email-spoof).
- Saat shadow user di-claim, gabungkan `balance`, `wallet_transactions`, `reviews`, `notifications` yang sudah ada (walaupun kemungkinan kecil guest punya itu semua).
- Shadow user yang idle > 1 tahun tanpa order baru → kandidat purge (Fase lanjutan, bukan MVP).

---

## 8. Fase Pengembangan (Milestone)

Setiap task ada **Acceptance Criteria (AC)** yang harus terpenuhi sebelum dianggap selesai.

### Fase 0 — Setup ✅ (selesai)

- [x] Install dep runtime yang dipakai di Fase 0: `drizzle-orm`, `postgres`, `zod`, `dotenv` (dev), `tsx` (dev). Dep lain di-install saat fase yang membutuhkannya (lazy-install): `better-auth` di Fase 1, `react-hook-form`/`@hookform/resolvers` di Fase 1-3, `zustand` di Fase 3, `@tanstack/react-query` saat butuh client fetching, `pino` di Fase 5-7, dst.
- [x] Setup shadcn/ui (`shadcn@4.7.0` init, preset `base-nova`, base color `neutral`) + komponen: button, input, label, card, dialog, dropdown-menu, sonner, table, select, tabs, badge, skeleton. **Deferred**: `form` (install bareng `react-hook-form` di Fase 1).
- [x] Setup Drizzle: `src/db/index.ts` (client singleton + pool, dev global cache), `src/db/schema.ts` (placeholder `health_check`). Upgrade `drizzle-orm` ke v0.45.2 untuk patch GHSA-gpj5-g38j-94v9 (SQL injection).
- [x] `docker compose up -d` jalan (Postgres `localhost:5433` — port non-default untuk hindari konflik dengan Postgres native Windows Service di mesin). `npm run db:migrate` sukses. `npm run dev` jalan, halaman `/` render HTTP 200 dengan badge **DB: connected** (verified end-to-end).
- [x] Prettier (+ tailwind plugin) + Husky + lint-staged + pre-commit hook aktif.
- [x] Struktur folder dasar: `src/app/`, `src/components/ui/`, `src/lib/`, `src/db/`. **Deferred**: `src/server/` (dibuat di Fase 1 saat menambah auth server actions), `src/hooks/`, `src/stores/`, `src/emails/`, `tests/`, `scripts/` (menyusul per fase).
- [x] `.env.local` terisi + `.env.example` ditambah `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- [x] `next.config.ts`: `output: "standalone"` (untuk Docker), `turbopack.root` pinned, security headers baseline (X-Content-Type-Options, Referrer-Policy, X-Frame-Options).
- [x] Landing page `/` = Fase 0 smoke test (env + Node version + DB ping badge via Server Component, `force-dynamic`).
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — semua hijau.

**AC**: ✅ `npm run dev` tanpa error · TypeScript strict mode on · DB query dari Server Component berhasil (badge "connected" hijau).

### Fase 1 — Auth & User (2-3 hari)

- [ ] Install Better-Auth + Drizzle adapter, generate schema tabel auth.
- [ ] Flow: register (email verify), login, logout, forgot password, reset password.
- [ ] **OAuth Google** (MVP) — setup Google Cloud credentials, flow login + auto-claim shadow user.
- [ ] Logic **claim shadow user** saat register / OAuth pertama (lihat §7.8).
- [ ] Middleware proteksi route `/dashboard/**` dan `/admin/**`.
- [ ] Server util: `getSession()`, `requireUser()`, `requireAdmin()`, `findOrCreateShadowUser(email, name?, phone?)`.
- [ ] Seed user admin pertama (`npm run db:seed`).
- [ ] Halaman `/dashboard/profile` (update nama, phone, password).
- [ ] Rate limit pada login (5 attempt / 15 menit / IP).

**AC**: user bisa register → verify → login → akses dashboard → logout. Admin tidak bisa diakses member. Password di-hash pakai argon2id. OAuth Google berhasil login & merge ke shadow user bila email sama.

### Fase 2 — Katalog Produk ✅ (selesai)

- [x] Schema `categories`, `products`, `product_variants` + migration (`drizzle/0002_petite_stellaris.sql`).
- [x] Admin: CRUD kategori (`/admin/categories` — list + dialog create/edit/delete + soft-guard saat masih dipakai produk).
- [x] Admin: CRUD produk (`/admin/products`, `/admin/products/new`, `/admin/products/[id]`) + upload gambar via `/api/uploads` (local storage `public/uploads/`, multi-image dengan thumbnail).
- [x] Admin: CRUD varian per produk (manager dalam halaman edit produk, guard "minimal 1 varian aktif").
- [x] Public: `/products` dengan filter (kategori, price range, search, tipe), sort (terbaru, terlaris, harga), paginasi (`pageSize = 12`).
- [x] Public: `/products/[slug]` — galeri, varian selector, deskripsi (react-markdown + remark-gfm), related products.
- [x] Public: `/c/[category]` + landing `/` (featured + kategori nav) + layout publik dengan header/footer.
- [x] SEO: `generateMetadata` per produk + per kategori + JSON-LD `Product` schema (incl. offers, aggregateRating).
- [x] `revalidate = 300` (ISR) di landing, katalog, detail, kategori; admin mutation → `revalidatePath`.
- [x] Seed diperluas (3 kategori + 12 produk + 28 varian) — idempotent.
- [x] `npm run typecheck`, `npm run lint`, `npm run build` semua hijau.

**AC**: ✅ admin full CRUD berjalan (kategori, produk, varian, upload gambar) · katalog publik responsive dengan filter & pagination · `generateMetadata` + JSON-LD siap untuk SEO.

### Fase 2 — Katalog Produk (deprecated checklist)

- [x] Schema `categories`, `products`, `product_variants` + migration.
- [x] Admin: CRUD kategori.
- [x] Admin: CRUD produk (form + upload image via `/api/uploads` — local storage dulu).
- [x] Admin: CRUD varian per produk.
- [x] Public: `/products` dengan filter (kategori, price range, search), sort (terbaru, terlaris, harga), paginasi.
- [x] Public: `/products/[slug]` — galeri, varian selector, deskripsi (markdown), related products.
- [x] SEO: `generateMetadata` per produk.

**AC**: admin bisa full CRUD, katalog publik responsive, lighthouse SEO > 90.

### Fase 3 — Cart & Checkout (3-4 hari)

- [x] Cart store (Zustand + `persist` localStorage).
- [x] Halaman `/cart` (update qty, hapus item, tampilkan stok tersisa bila tracked).
- [x] Halaman `/checkout`:
  - Guest form (email, name, phone, notes — wajib) — auto-lookup / create shadow user.
  - Jika email sudah claimed → redirect ke login (lihat §7.8).
  - Member (login): form prefilled, email read-only.
  - Toggle pakai saldo (bila login & balance > 0).
  - Apply voucher — skip bila Fase 6 belum jalan.
  - Pilih payment method.
- [x] Integrasi Mayar:
  - `src/lib/payment/mayar.ts` (create invoice, verify webhook).
  - Create order → create Mayar invoice → redirect.
- [x] Route `/api/webhooks/mayar` dengan signature verify + idempotency.
- [x] **Magic link guest**: generate `order_access_tokens` setelah paid, kirim via email.
- [x] Halaman `/order/[orderNumber]?token=<opaque>` — guest bisa polling status; member lihat tanpa token (session check).
- [x] Cron/worker expire pending order.

**AC**: happy path lengkap (pilih → checkout guest & member → bayar → status paid). Webhook tahan duplikat & replay. Guest bisa lihat order via magic link.

### Fase 4 — Inventori Akun & Delivery (2-3 hari)

- [x] `src/lib/crypto.ts` (AES-256-GCM encrypt/decrypt).
- [x] Admin: CRUD stok, view status, filter available/sold.
- [x] Admin: bulk import CSV (`email,password,profile,notes`).
- [x] Auto-assign stock saat webhook paid (race-safe).
- [x] Email kredensial via Resend (template react-email).
- [x] Halaman `/dashboard/orders/[id]` — tombol "Tampilkan Kredensial" (decrypt on demand, log audit access).
- [x] Tombol "Salin" kredensial.

**AC**: beli produk auto → email masuk dengan kredensial → dashboard tampilkan kredensial yang sama. Stock tidak pernah double-assigned (concurrency test).

### Fase 5 — Admin Panel (3-4 hari)

- [x] Layout admin (sidebar, topbar, breadcrumb).
- [x] `/admin` dashboard: revenue (day/week/month), total order per status, top products, low stock alert — pakai Recharts.
- [x] `/admin/orders` — table dengan filter (status, tanggal, search), aksi (deliver manual, cancel, refund).
- [x] `/admin/users` — list + detail (ban/unban, reset password, history order).
- [x] `/admin/payments` — rekap per gateway, export CSV.
- [x] Audit log record untuk setiap aksi admin sensitif.

**AC**: admin bisa handle full lifecycle order (termasuk manual) tanpa query DB manual.

### Fase 6 — Fitur Tambahan (3-5 hari)

- [ ] **Voucher**: admin CRUD, checkout apply, validasi expiry/limit/user-limit, redemption tercatat.
- [ ] **Wallet**: top-up via Mayar, riwayat transaksi, pakai saldo di checkout (parsial & full).
- [ ] **Review**: member bisa review hanya produk yang di-delivered, 1 review / order-item, admin bisa hide.
- [ ] **Notifikasi in-app**: bell icon di topbar, mark as read.
- [ ] **WhatsApp float**: konfigurasi nomor di `site_settings`.

**AC**: semua fitur tambahan aktif & teruji happy path.

### Fase 7 — Polish & Deploy (3-4 hari)

- [ ] SEO: metadata seluruh halaman public, `sitemap.ts`, `robots.ts`, Open Graph image.
- [ ] Loading state (Suspense + `loading.tsx`), error boundary (`error.tsx`), 404 (`not-found.tsx`).
- [ ] Rate limit (login, checkout, forgot-password, magic-link request).
- [ ] A11y audit (keyboard nav, aria, contrast).
- [ ] E2E test Playwright: register, login, checkout guest, checkout member, claim shadow, refund.
- [ ] **Dockerize app**: `Dockerfile` (multi-stage, Next standalone output), `.dockerignore`.
- [ ] **docker-compose.prod.yml**: app + postgres + caddy/traefik (HTTPS otomatis).
- [ ] **Runbook VPS**:
  - Provisioning (Ubuntu 22.04/24.04, install Docker, firewall UFW).
  - Clone repo, set `.env.production`, `docker compose -f docker-compose.prod.yml up -d`.
  - DB migration: `docker compose run app npm run db:migrate`.
  - Backup script `pg_dump` cron → off-site (R2/S3).
- [ ] Reverse proxy (Caddy recommended untuk auto-SSL) atau Traefik.
- [ ] Domain + DNS + HTTPS (Let's Encrypt via Caddy).
- [ ] Setup Sentry + Pino logging (file + stdout, di-collect via `docker logs`).
- [ ] Setup Mayar production credentials + webhook URL public.
- [ ] Uptime monitoring (BetterStack/UptimeRobot free).
- [ ] Dokumentasi README + runbook refund manual + rotation key.

**AC**: aplikasi hidup di domain, HTTPS aktif, semua happy path E2E hijau, monitoring aktif, backup DB terjadwal.

**Total estimasi**: ~3-4 minggu MVP solo developer.

---

## 9. Keamanan

### Wajib di MVP

- **Password hashing**: argon2id (via Better-Auth atau `@node-rs/argon2`).
- **Session**: cookie `HttpOnly`, `Secure`, `SameSite=Lax`, di-refresh.
- **CSRF**: Server Actions Next.js punya bawaan; tetap tambahkan origin check untuk webhook.
- **Rate limit**: login, register, forgot-password, checkout, webhook replay (Upstash Redis).
- **Input validation**: **Zod** di setiap Server Action / route handler. **Tidak ada trust pada client**.
- **Webhook verify**: signature / token Mayar wajib cek sebelum proses.
- **Enkripsi credential**: AES-256-GCM; plaintext hanya muncul saat decrypt on-demand di server.
- **Role check server-side**: `requireAdmin()` di Server Action + middleware; jangan bergantung pada UI.
- **Audit log**: tiap aksi admin (delete, refund, ubah saldo, ubah role) masuk `audit_logs`.
- **HTTPS only** (Vercel otomatis) + HSTS header.
- **CSP header**: minimal strict default-src, kecuali domain yang diperlukan.
- **Secret di env**: tidak pernah committed, rotasi bila bocor.
- **Error response**: tidak bocorkan stack trace ke client production.

### Nice to have

- 2FA (TOTP) untuk admin.
- Device/session list di dashboard member.
- Sign-in notifikasi email untuk login baru.

---

## 10. Anti-Abuse & Fraud Prevention

- **Email verify wajib** sebelum bisa checkout (atau setidaknya sebelum klaim kredensial).
- **Limit checkout**: max N order pending per user per jam.
- **Limit akun per email/device**: pakai fingerprint ringan (IP + UA) untuk deteksi multi-akun agresif.
- **Stok assignment first-paid-first-served**: pakai `FOR UPDATE SKIP LOCKED` agar tidak ada 2 user dapat kredensial sama.
- **Warranty mechanism**: kredensial yang direport "tidak bisa login" masuk queue admin, jangan auto-refund.
- **Blacklist email domain** (opsional): blokir disposable email.
- **Cooldown refund**: max 1 refund / hari / user agar tidak abuse.
- **Voucher anti-abuse**: `max_uses_per_user`, `min_spend`, cek histori redeem sebelum apply.
- **Disable account cred setelah refund**: tidak dijual ulang otomatis.

---

## 11. Performance & Caching

- **Server Components** sebagai default; Client Component hanya saat perlu state/event.
- **Streaming + Suspense** untuk landing & product list.
- **ISR / revalidate**: `/`, `/products`, `/products/[slug]` pakai `revalidate = 300` + `revalidateTag` saat admin edit.
- **Image optimization**: `next/image`, WebP/AVIF auto.
- **DB**:
  - Index sesuai section 5 (status filter, FK, search).
  - Connection pool (pakai `postgres` client dengan `max`).
  - Selective column (jangan `SELECT *`).
- **Cache aggregate** (rating_avg, sold_count) denormalized di products.
- **CDN**: Vercel Edge.
- **Bundle**: `next/dynamic` untuk chart admin, tiptap editor, dsb.

---

## 12. Observability

- **Logger**: Pino di server; request-id per request.
- **Error tracking**: Sentry (client + server) di production.
- **Structured log events**: `order.created`, `payment.paid`, `stock.assigned`, `refund.approved`, `auth.login`.
- **Webhook dashboard**: halaman `/admin/webhook-logs` untuk debug Mayar callback.
- **Health check**: `/api/health` (DB ping + app status).
- **Uptime**: BetterStack / UptimeRobot.

---

## 13. Testing Strategy

| Level       | Tool                             | Cakupan                                                              |
| ----------- | -------------------------------- | -------------------------------------------------------------------- |
| Unit        | Vitest                           | Util pure (crypto, voucher calc, price calc, stock assignment logic) |
| Integration | Vitest + Testcontainers Postgres | Server Actions dengan DB nyata                                       |
| Component   | Vitest + Testing Library         | Form validation, cart store                                          |
| E2E         | Playwright                       | Critical path: register → login → checkout auto → email → dashboard  |
| Webhook     | Script supertest / playwright    | Replay Mayar payload, idempotency                                    |

- Target coverage MVP: **60%+ di `src/server/`, `src/lib/`**; UI coverage best-effort.
- CI jalan test di setiap PR (GitHub Actions).
- **Fixture data** via `src/db/seed.ts`.

---

## 14. Backup & Disaster Recovery

- **DB backup**:
  - Local dev: volume docker + `pg_dump` manual.
  - Production (VPS): `pg_dump` otomatis harian via cron di host, upload terenkripsi ke R2/S3 / storage off-site. Retensi: 7 harian + 4 mingguan.
- **Kredensial akun**: key enkripsi disimpan di env, **wajib dibackup di password manager** (bila hilang → semua credential tidak bisa decrypt).
- **Runbook**:
  - Restore DB dari backup.
  - Rotasi `CREDENTIALS_ENCRYPTION_KEY`: re-encrypt semua row lama pakai script migrasi.
  - Mayar outage: fallback ke manual transfer bank + admin input manual.

---

## 15. Accessibility, SEO, & i18n

### Accessibility

- shadcn/ui (Radix base) sudah ARIA-friendly.
- Audit dengan `axe-core` di E2E.
- Kontras warna min WCAG AA, keyboard navigable, skip-to-content link.

### SEO

- Metadata per page (`generateMetadata`).
- `sitemap.ts`, `robots.ts`.
- JSON-LD `Product` schema di detail produk.
- Slug SEO-friendly (kebab-case, unique).

### i18n

- **MVP**: Bahasa Indonesia only.
- **Siapkan struktur** `src/i18n/` + `next-intl` opsional; hard-code label MVP tapi hindari mencampur dengan logic agar mudah di-lift nanti.

---

## 16. Struktur Folder (Final)

```
ai3/
├── src/
│   ├── app/
│   │   ├── (public)/                # landing, katalog, cart, checkout
│   │   │   ├── page.tsx
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   └── checkout/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── ...
│   │   ├── (member)/dashboard/
│   │   ├── (admin)/admin/
│   │   ├── api/
│   │   │   ├── webhooks/mayar/route.ts
│   │   │   ├── auth/[...all]/route.ts
│   │   │   ├── uploads/route.ts
│   │   │   └── health/route.ts
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                      # shadcn
│   │   ├── layout/                  # header, footer, sidebar
│   │   ├── product/
│   │   ├── cart/
│   │   ├── admin/
│   │   └── forms/
│   ├── db/
│   │   ├── schema.ts                # drizzle schema
│   │   ├── index.ts                 # client
│   │   └── seed.ts
│   ├── server/
│   │   ├── actions/                 # server actions (cart, order, admin, auth)
│   │   ├── services/                # business logic (orderService, stockService, paymentService, walletService)
│   │   └── queries/                 # shared read queries
│   ├── lib/
│   │   ├── auth.ts                  # better-auth instance
│   │   ├── crypto.ts                # AES-256-GCM
│   │   ├── payment/
│   │   │   └── mayar.ts
│   │   ├── mail/
│   │   │   ├── resend.ts
│   │   │   └── templates/*.tsx
│   │   ├── rate-limit.ts
│   │   ├── logger.ts
│   │   ├── env.ts                   # Zod-parsed env
│   │   └── utils.ts
│   ├── hooks/
│   ├── stores/                      # zustand
│   ├── types/
│   └── emails/                      # react-email source
├── drizzle/                         # migrations
├── public/
├── tests/
│   ├── e2e/                         # playwright
│   └── unit/                        # vitest
├── scripts/                         # seed, import CSV, key rotation, pg_dump cron
├── ops/
│   ├── Caddyfile                    # reverse proxy + HTTPS
│   └── backup.sh                    # pg_dump + upload R2/S3
├── Dockerfile                       # multi-stage build (Next standalone)
├── .dockerignore
├── docker-compose.yml               # dev (postgres only; DB UI via `npm run db:studio`)
├── docker-compose.prod.yml          # prod (app + postgres + caddy)
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── .env.example
```

---

## 17. Naming & Convention

- **Files**: kebab-case untuk folder & file non-komponen, PascalCase untuk React component file.
- **Server actions**: `createOrder`, `cancelOrder` — ekspor dari `src/server/actions/*.ts` dengan `"use server"`.
- **Services**: `orderService.create(input)` — pure business logic, dapat diimport dari action mana saja.
- **Enum / const**: `UPPER_SNAKE_CASE` untuk const, `PascalCase` untuk type.
- **Route groups**: `(public)`, `(auth)`, `(member)`, `(admin)`.
- **Commit**: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`).
- **Branch**: `feat/nama-fitur`, `fix/issue-123`.

---

## 18. Environment & Config

- Sumber tunggal: `.env.example`. `.env.local` (dev) dan `.env.production` (VPS) tidak boleh di-commit.
- Semua env di-parse & validasi via Zod di `src/lib/env.ts`. App **crash fail-fast** bila required env kosong.
- Env berdasarkan environment: **local** (docker-compose.yml, `.env.local`), **production** (VPS, `.env.production` di server, tidak disimpan di repo).
- Catat juga `next.config.ts` perlu `output: "standalone"` supaya Docker image ringan.

---

## 19. Mayar Integration Notes

- **Base URL**: `https://api.mayar.id/hl/v1` (sudah di `.env.example`).
- **Key env**: `MAYAR_API_KEY`, `MAYAR_WEBHOOK_TOKEN`, `MAYAR_BASE_URL`.
- Abstract di `src/lib/payment/mayar.ts`:
  - `createInvoice({ orderNumber, amount, customer, items, redirectUrl })`
  - `verifyWebhook(req): { valid: boolean, event: MayarEvent }`
  - `getTransaction(id)` (polling fallback bila webhook terlambat).
- Simpan `raw_request` & `raw_response` di `payments` untuk audit & debug.
- Timeout: 15s + retry 2x pada outbound API call.
- Sandbox credential untuk dev (minta dari dashboard Mayar).
- **Detail exact endpoint & payload** → cek dokumentasi resmi Mayar saat implementasi; jangan asumsi.

---

## 20. Email Strategy

- Via Resend + react-email templates.
- Email essential MVP:
  1. Verify email (setelah register)
  2. Reset password
  3. Order confirmation (setelah paid)
  4. Kredensial akun (auto delivery)
  5. Order delivered notification (manual)
  6. Refund approved
- Template di `src/emails/*.tsx`, sender `EMAIL_FROM`.
- Retry via queue sederhana (table `email_outbox` opsional) — bila Resend down, re-send.

---

## 21. Seeding & Data Generation

- `src/db/seed.ts`:
  - 1 user admin (email & password dari `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
  - 3 kategori: **Hiburan** (slug `hiburan`), **AI** (slug `ai`), **Produktifitas** (slug `produktifitas`).
  - 10-15 produk contoh + varian, tersebar di 3 kategori:
    - _Hiburan_ → Netflix, Spotify, Disney+, YouTube Premium
    - _AI_ → ChatGPT Plus, Claude Pro, Midjourney, Gemini Advanced
    - _Produktifitas_ → Canva Pro, Notion Plus, Office 365, Google Workspace
  - 50 stock dummy untuk produk auto (kredensial dummy ter-enkripsi).
- Script CSV importer di `scripts/import-stocks.ts`.

---

## 22. Edge Cases & Business Rules

- **Guest checkout**: diizinkan. Setiap order selalu terikat ke `users.id` (shadow user untuk non-login). Saat register/login dengan email yang sama, otomatis di-claim. Detail: §7.8.
- **Refund setelah kredensial dilihat**: tetap boleh refund bila dalam masa warranty & ada bukti; kredensial di-disable.
- **Perubahan harga saat item di cart**: snapshot price di `order_items.unit_price` saat create order, tidak ikut perubahan di produk.
- **Stok tiba-tiba hilang** (admin delete): order yang sudah paid harus kirim notif error ke admin & tidak auto-cancel.
- **Wallet negatif**: tidak boleh. Semua `wallet_transactions` harus memastikan `balance_after >= 0`.
- **Concurrent redeem voucher**: pakai constraint `UNIQUE (voucher_id, order_id)` + cek `used_count < max_uses` dalam transaction.
- **Email bounce / spam**: handle webhook Resend (Fase 7+).
- **Time zone**: simpan `timestamptz` UTC, render ke `Asia/Jakarta` di UI.

---

## 23. CI/CD

- **GitHub Actions**:
  - `ci.yml`: lint + typecheck + unit test di setiap push/PR.
  - `e2e.yml`: Playwright di PR ke `main` (optional scheduled).
  - `deploy.yml`: build Docker image → push ke GHCR → SSH ke VPS → `docker compose pull && up -d` → `docker compose run app npm run db:migrate`.
  - Block merge bila merah.
- **VPS deploy**:
  - First-time manual: provisioning script + SSH key setup.
  - Selanjutnya pakai workflow `deploy.yml` otomatis saat merge ke `main`.
  - Env vars `.env.production` dikelola manual di server (atau via `doppler` / `sops` bila ingin versioned).
- **DB migration**:
  - `drizzle-kit generate` di dev → commit.
  - `drizzle-kit migrate` dijalankan di deploy step (container one-shot).

---

## 24. Definition of Done (checklist sebelum merge ke `main`)

- [ ] TS compile tanpa error (`tsc --noEmit`).
- [ ] ESLint pass, Prettier rapi.
- [ ] Unit + integration test hijau untuk kode baru.
- [ ] Manual QA happy path lokal.
- [ ] Tidak ada `console.log` atau komentar TODO tanpa issue.
- [ ] Migration baru (kalau ada) sudah di-generate & test up/down.
- [ ] Dokumentasi inline (JSDoc) untuk fungsi service public.
- [ ] Commit mengikuti Conventional Commits.

---

## 25. Pre-flight Checklist (sebelum mulai Fase 0)

- [ ] Docker Desktop hidup, `docker compose up -d` sukses (Postgres container jalan).
  - Port Postgres dipetakan ke **`localhost:5433`** (bukan 5432) untuk menghindari konflik dengan Postgres native di host. `.env.example` dan `.env.local` sudah pakai port ini.
  - DB UI pakai **Drizzle Studio** via `npm run db:studio` (bukan Adminer; lebih enak & schema-aware).
- [ ] Node 20+ (LTS) & npm/pnpm siap.
- [ ] `.env.local` sudah diisi semua required field.
- [ ] Mayar sandbox credential didapat.
- [ ] Resend API key didapat (bisa pakai domain `onresend.com` sandbox awal).
- [ ] Google Cloud project + OAuth client ID/secret (untuk Google login).
- [ ] Repo sudah di-init git + remote (GitHub) siap.
- [ ] Baca `AGENTS.md` + `node_modules/next/dist/docs/` (setelah install) — khusus perubahan App Router di Next.js 16.
- [ ] VPS & domain belum perlu di Fase 0-6 (baru diperlukan di Fase 7).

---

## 26. Status Keputusan

Semua pertanyaan awal sudah dikonfirmasi. Ringkasan:

| #   | Pertanyaan     | Jawaban                                                |
| --- | -------------- | ------------------------------------------------------ |
| 1   | Auth library   | Better-Auth                                            |
| 2   | OAuth Google   | Masuk MVP                                              |
| 3   | Wallet / saldo | Masuk MVP                                              |
| 4   | Guest checkout | Diizinkan + auto-claim shadow user saat register/login |
| 5   | Deployment     | VPS (Dockerized). Dev lokal dulu                       |
| 6   | Brand          | AI3 (final)                                            |
| 7   | Kategori awal  | Hiburan, AI, Produktifitas                             |

**Siap mulai Fase 0.**

---

## 27. Changelog Plan

- **v1** — Plan awal.
- **v2** — Sinkron dengan state repo: Next.js 16, Mayar, Tailwind v4, schema lebih detail, tambah anti-abuse, observability, testing, backup, CI/CD, struktur folder final, acceptance criteria per fase.
- **v3** — Lock keputusan user:
  - Better-Auth + Google OAuth masuk MVP.
  - Wallet masuk MVP.
  - **Guest checkout** dengan pola _shadow user_ + magic link + auto-claim on register/login (§7.8).
  - Deploy **Docker + VPS** (dulu Vercel) — tambah `Dockerfile`, `docker-compose.prod.yml`, Caddyfile, backup script; CI/CD pakai GHCR + SSH deploy.
  - Schema: `users.password_hash` nullable + `claimed_at`; order `guest_email` dihapus jadi `is_guest_order`; tabel baru `order_access_tokens`.
  - Seed kategori: Hiburan, AI, Produktifitas.
- **v4** — **Fase 0 selesai.**
  - Dependencies Fase 0 terinstall: drizzle-orm (v0.45.2, patched SQL injection), postgres, zod, dotenv, tsx.
  - shadcn/ui initialized + 12 komponen dasar (form deferred ke Fase 1).
  - Prettier + Husky + lint-staged + pre-commit hook aktif.
  - Landing page `/` sekarang smoke test Fase 0 (env + Node + DB ping badge, force-dynamic).
  - Host port mapping Docker diubah untuk hindari konflik mesin user:
    - Postgres: **5433**:5432 (konflik dengan Postgres native Windows Service di host).
    - Adminer: **8082**:8080 (konflik dengan project `private-mail` yang pakai 8080 & 8081).
  - `drizzle.config.ts` eksplisit load `.env.local` (bukan cuma `.env`).
  - `next.config.ts`: `output: "standalone"` + `turbopack.root` + security headers baseline.
  - `typecheck` + `lint` + `build` hijau; dev server verified HTTP 200 dengan badge DB "connected".
- **v5** — Simplify local dev stack:
  - **Drop Adminer** dari `docker-compose.yml`. DB UI pakai **Drizzle Studio** (`npm run db:studio`) — schema-aware, TS-native, gak butuh container tambahan.
  - Container lokal sekarang cuma `ai3-postgres` saja.
- **v6** (sekarang) — **Fase 2 selesai.**
  - Migration `0002_petite_stellaris` tambah 3 enum (`product_type`, `delivery_type`, `stock_mode`) + 3 tabel (`categories`, `products`, `product_variants`).
  - Zod schema katalog dipindah ke `src/lib/schemas/{categories,products}.ts` supaya Server Actions + client form bisa sama-sama import tanpa bocoran `server-only` ke bundle client.
  - Upload gambar lokal via `POST /api/uploads` → `public/uploads/{folder}/{YYYY}/{MM}/{hex}.{ext}`.
  - Next.js 16 `images.remotePatterns` dikosongkan; uploader pakai `unoptimized` (local path). Tambahkan pattern saat pindah ke Supabase/R2 di Fase 7.
  - Dependencies baru: `react-markdown`, `remark-gfm` (deskripsi produk); shadcn `textarea`, `checkbox`, `switch`, `separator`.
  - Seed idempotent: 3 kategori (Hiburan / AI / Produktifitas) + 12 produk + 28 varian.
