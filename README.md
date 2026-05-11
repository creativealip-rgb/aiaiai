# AI3 Marketplace

Marketplace akun & jasa digital berbasis Next.js 16 + Drizzle + PostgreSQL + Better-Auth.

## Stack
- Next.js 16 (App Router), React 19, TypeScript
- PostgreSQL 16 + Drizzle ORM
- Better-Auth (email/password + Google OAuth)
- Mayar (payment gateway)
- Tailwind v4 + shadcn/ui

## Prasyarat
- Node.js 20+
- Docker + Docker Compose

## Local Development
1. Salin env:
```bash
cp .env.example .env.local
```
2. Jalankan PostgreSQL lokal:
```bash
docker compose up -d
```
3. Install dependency:
```bash
npm install
```
4. Migrasi DB:
```bash
npm run db:migrate
```
5. Seed data:
```bash
npm run db:seed
```
6. Jalankan app:
```bash
npm run dev
```

## Quality Checks
```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## E2E Tests (Playwright)
Smoke:
```bash
npm run test:e2e
```
Flow kritikal (opt-in):
```bash
E2E_FULL=1 npm run test:e2e
```

## Production (Docker + Caddy)
File utama:
- `Dockerfile`
- `docker-compose.prod.yml`
- `ops/Caddyfile`
- `ops/backup.sh`

Langkah ringkas:
1. Siapkan `.env.production` dari `.env.example`.
2. Pastikan `DOMAIN`, `DATABASE_URL`, `AUTH_SECRET`, `CREDENTIALS_ENCRYPTION_KEY`, dan kredensial Mayar sudah valid.
3. Jalankan:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
4. Migrasi:
```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:migrate
```

## Health Check
- Endpoint: `/api/health`
- Digunakan untuk container healthcheck dan monitoring uptime.

## Observability
- Structured logging: `src/lib/logger.ts` (Pino)
- Sentry scaffold:
  - `instrumentation.ts`
  - `instrumentation-client.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`

Aktif jika env Sentry diisi (`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`).

## Ops Docs
- [ops/RUNBOOK_VPS.md](ops/RUNBOOK_VPS.md)
- [ops/REFUND_RUNBOOK.md](ops/REFUND_RUNBOOK.md)
- [ops/KEY_ROTATION.md](ops/KEY_ROTATION.md)

