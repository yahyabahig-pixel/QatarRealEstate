#!/usr/bin/env bash
# =========================================================================================
# Database backup.
#
#     ./scripts/backup-db.sh
#
# There was no backup of any kind. Every listing, every photo (photos live in the database
# as varbinary) and every lead existed in exactly one place: the qre_mssql-data Docker
# volume on one VPS. `docker compose down -v`, a disk failure, or a bad `docker volume rm`
# would have ended the business's data. This is the smallest thing that fixes that.
#
# What it does
#   * runs BACKUP DATABASE inside the sqlserver container (a real, consistent SQL Server
#     backup — not a file copy of a running database, which is not restorable)
#   * copies the .bak out to ./backups on the host
#   * deletes backups older than RETENTION_DAYS (default 14)
#
# Run it from a cron job on the server. Daily at 02:30:
#     30 2 * * *  cd /opt/qre && ./scripts/backup-db.sh >> /var/log/qre-backup.log 2>&1
#
# IMPORTANT: a backup that has never been restored is not a backup. Run
# ./scripts/restore-db.sh at least once against a scratch database, and again whenever the
# schema changes meaningfully. And copy ./backups OFF this machine — a backup that lives on
# the same disk as the database does not survive the disk.
# =========================================================================================
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DB_NAME="${DB_NAME:-QatarRealEstate}"
SERVICE="${SQLSERVER_SERVICE:-sqlserver}"
BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${DB_NAME}-${STAMP}.bak"

die() { echo "backup failed: $*" >&2; exit 1; }

command -v docker >/dev/null || die "docker is not installed."
[ -f docker-compose.yml ] || die "no docker-compose.yml here — run this from the deployment directory."

docker compose ps --status running --services 2>/dev/null | grep -qx "$SERVICE" \
  || die "the '$SERVICE' container is not running."

# NOTE: this script deliberately does NOT read .env.
#
# It used to `. ./.env` to check SA_PASSWORD was set — but .env is a Compose file, not a
# shell script. Compose is happy with `MAIN_ADMIN_NAME=Main Admin`; bash reads that as
# `MAIN_ADMIN_NAME=Main` and then tries to run `Admin` as a command, which under `set -e`
# killed the script before it took a single backup. In cron that is a log full of
# "Admin: command not found" and, silently, no backups at all. Any value containing a
# space, a `#` or a `$` did the same.
#
# It never needed the file anyway: the password is already in the container's environment as
# MSSQL_SA_PASSWORD, which is also why it never appears on a command line that `ps` can see.
# Checking that sqlcmd can actually authenticate is a better precondition than checking that
# a variable is non-empty.
docker compose exec -T "$SERVICE" \
  bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "SELECT 1" -h -1' \
  >/dev/null 2>&1 \
  || die "cannot log in to SQL Server inside the '$SERVICE' container. Check MSSQL_SA_PASSWORD / SA_PASSWORD in .env."

mkdir -p "$BACKUP_DIR"

echo "Backing up ${DB_NAME} …"
# The SQL is assembled HERE, where normal shell quoting applies, and piped into sqlcmd
# inside the container. That keeps the password in the container's own environment (never
# on a command line that shows up in `ps`) without three layers of nested quoting.
#
# COMPRESSION is not requested: SQL Server Express does not support it. CHECKSUM plus
# RESTORE VERIFYONLY is the part that matters — it catches a backup that wrote corrupt
# pages, which is precisely the backup you do not want to discover is useless mid-crisis.
docker compose exec -T "$SERVICE" mkdir -p /var/opt/mssql/backup \
  || die "could not create the backup directory inside the container."

printf '%s\n' \
  "BACKUP DATABASE [${DB_NAME}] TO DISK = N'/var/opt/mssql/backup/${FILE}' WITH INIT, FORMAT, CHECKSUM, STATS = 10;" \
  "RESTORE VERIFYONLY FROM DISK = N'/var/opt/mssql/backup/${FILE}' WITH CHECKSUM;" \
  | docker compose exec -T "$SERVICE" \
      bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -i /dev/stdin' \
  || die "BACKUP DATABASE failed (see the SQL Server error above)."

docker compose cp "${SERVICE}:/var/opt/mssql/backup/${FILE}" "${BACKUP_DIR}/${FILE}" \
  || die "the backup was created inside the container but could not be copied out."

# Keep the container's copy from growing without limit.
docker compose exec -T "$SERVICE" rm -f "/var/opt/mssql/backup/${FILE}" || true

SIZE=$(du -h "${BACKUP_DIR}/${FILE}" | cut -f1)
echo "Wrote ${BACKUP_DIR}/${FILE} (${SIZE})"

# ---- retention ---------------------------------------------------------------------------
if [ "$RETENTION_DAYS" -gt 0 ]; then
  removed=$(find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}-*.bak" -type f -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')
  [ "$removed" = "0" ] || echo "Removed ${removed} backup(s) older than ${RETENTION_DAYS} days."
fi

echo "Backups on disk:"
ls -1sh "$BACKUP_DIR"/*.bak 2>/dev/null | tail -5
echo
echo "Reminder: copy ${BACKUP_DIR} to another machine. A backup on the same disk as the"
echo "database does not survive that disk."
