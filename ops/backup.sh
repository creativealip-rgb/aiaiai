#!/usr/bin/env sh
set -eu

# Usage:
#   BACKUP_DIR=/backups ./ops/backup.sh
# Optional:
#   RETENTION_DAYS=14 BACKUP_PREFIX=ai3

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_PREFIX="${BACKUP_PREFIX:-ai3}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DATE_UTC="$(date -u +"%Y%m%d-%H%M%S")"

mkdir -p "${BACKUP_DIR}"

OUTPUT_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-${DATE_UTC}.sql.gz"

echo "[backup] creating ${OUTPUT_FILE}"
docker compose -f "${COMPOSE_FILE}" exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip -9 > "${OUTPUT_FILE}"

echo "[backup] pruning files older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -type f -name "${BACKUP_PREFIX}-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] done"

