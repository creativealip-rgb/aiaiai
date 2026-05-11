# Runbook VPS (AI3)

## 1) Provision Server
- OS: Ubuntu 22.04/24.04
- Install Docker + Compose plugin
- Configure firewall:
  - allow `22/tcp`
  - allow `80/tcp`
  - allow `443/tcp`

## 2) Prepare Application
```bash
git clone https://github.com/creativealip-rgb/aiaiai.git
cd aiaiai
cp .env.example .env.production
```

Isi `.env.production` minimal:
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://<domain>`
- `DOMAIN=<domain>`
- `DATABASE_URL=postgresql://...`
- `AUTH_SECRET=...`
- `CREDENTIALS_ENCRYPTION_KEY=...`
- `MAYAR_API_KEY=...`
- `MAYAR_WEBHOOK_TOKEN=...`
- `RESEND_API_KEY=...`
- `EMAIL_FROM=...`
- `POSTGRES_PASSWORD=...`

## 3) Build & Start
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 4) Run Migration
```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:migrate
```

## 5) Verify
- App:
```bash
curl -I https://<domain>
```
- Health:
```bash
curl https://<domain>/api/health
```
- Logs:
```bash
docker compose -f docker-compose.prod.yml logs -f app
```

## 6) Mayar Webhook
- Set webhook URL di dashboard Mayar:
  - `https://<domain>/api/webhooks/mayar`
- Set token sama dengan `MAYAR_WEBHOOK_TOKEN`.

## 7) Backup
Manual:
```bash
BACKUP_DIR=/opt/ai3/backups ./ops/backup.sh
```
Cron harian (contoh jam 02:30):
```bash
30 2 * * * cd /opt/aiaiai && BACKUP_DIR=/opt/ai3/backups ./ops/backup.sh >> /var/log/ai3-backup.log 2>&1
```

## 8) Uptime Monitoring
- Daftarkan endpoint:
  - `https://<domain>/api/health`
- Tool rekomendasi: UptimeRobot / BetterStack.

## 9) Rollback Cepat
```bash
git checkout <last_known_good_tag_or_commit>
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm app npm run db:migrate
```

