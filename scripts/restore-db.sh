#!/usr/bin/env bash
# =========================================================================================
# Restore a backup made by scripts/backup-db.sh.
#
#   Rehearsal (what you should run regularly — restores into a SCRATCH database and leaves
#   the live one untouched):
#       ./scripts/restore-db.sh backups/QatarRealEstate-20260930-023000.bak
#
#   The real thing (OVERWRITES the live database — asks for confirmation first):
#       ./scripts/restore-db.sh backups/QatarRealEstate-20260930-023000.bak --into-live
#
# A backup nobody has ever restored is a guess, not a backup. The rehearsal mode exists so
# that "can we actually get our data back?" is a question with a tested answer BEFORE the
# day it matters. It costs one command and a few minutes of disk.
# =========================================================================================
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

BAK_PATH="${1:-}"
MODE="${2:-rehearsal}"
DB_NAME="${DB_NAME:-QatarRealEstate}"
SERVICE="${SQLSERVER_SERVICE:-sqlserver}"

die() { echo "restore failed: $*" >&2; exit 1; }
usage() { sed -n '2,16p' "$0"; exit 2; }

[ -n "$BAK_PATH" ] || usage
[ -f "$BAK_PATH" ] || die "no such file: $BAK_PATH"
[ -f .env ] || die "no .env next to docker-compose.yml — run this from the deployment directory."

case "$MODE" in
  --into-live) TARGET="$DB_NAME" ;;
  rehearsal)   TARGET="${DB_NAME}_RestoreTest" ;;
  *) usage ;;
esac

docker compose ps --status running --services 2>/dev/null | grep -qx "$SERVICE" \
  || die "the '$SERVICE' container is not running."

BASENAME="$(basename "$BAK_PATH")"
REMOTE="/var/opt/mssql/backup/${BASENAME}"

sql() {  # sql [extra sqlcmd args…]  — SQL arrives on stdin, runs inside the container
  docker compose exec -T "$SERVICE" \
    bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -i /dev/stdin "$@"' _ "$@"
}

if [ "$MODE" = "--into-live" ]; then
  cat <<WARN

  ============================================================================
  This will REPLACE the live database "${DB_NAME}" with the contents of
      ${BAK_PATH}
  Everything written since that backup was taken will be gone.

  The application should be stopped first:   docker compose stop backend
  ============================================================================

WARN
  printf 'Type the database name (%s) to continue: ' "$DB_NAME"
  read -r answer
  [ "$answer" = "$DB_NAME" ] || die "cancelled."
fi

echo "Copying ${BASENAME} into the container …"
docker compose exec -T "$SERVICE" mkdir -p /var/opt/mssql/backup || die "could not create the backup directory."
docker compose cp "$BAK_PATH" "${SERVICE}:${REMOTE}" || die "could not copy the backup in."

# The logical file names inside a .bak are those of the database it came from, and they have
# to be remapped when restoring under a different name — otherwise SQL Server tries to write
# over the live database's .mdf and refuses. Read them out of the backup rather than guessing.
echo "Reading the file list from the backup …"
# -w 8000: sqlcmd wraps output at 80 columns by DEFAULT, and RESTORE FILELISTONLY returns
# about twenty columns per row — so every row came back split across several lines and the
# loop below built MOVE clauses out of the fragments. The restore then failed with "Logical
# file '<garbage>' is not part of database", which is a terrible thing to discover during a
# real recovery.
FILELIST=$(printf '%s\n' "SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK = N'${REMOTE}';" \
  | sql -h -1 -W -w 8000 -s "|" 2>/dev/null) || die "the backup could not be read (is it corrupt, or from a newer SQL Server?)."

MOVE=""
while IFS='|' read -r logical physical rest; do
  [ -n "${logical:-}" ] || continue
  case "$logical" in *"rows affected"*|"") continue ;; esac
  ext="mdf"; case "$physical" in *.ldf) ext="ldf" ;; esac
  MOVE="${MOVE} MOVE N'${logical}' TO N'/var/opt/mssql/data/${TARGET}.${ext}',"
done <<< "$FILELIST"
[ -n "$MOVE" ] || die "could not read the file list out of the backup."

echo "Restoring into ${TARGET} …"
printf '%s\n' \
  "IF DB_ID(N'${TARGET}') IS NOT NULL ALTER DATABASE [${TARGET}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;" \
  "RESTORE DATABASE [${TARGET}] FROM DISK = N'${REMOTE}' WITH REPLACE, RECOVERY,${MOVE} STATS = 10;" \
  "ALTER DATABASE [${TARGET}] SET MULTI_USER;" \
  | sql || die "RESTORE DATABASE failed (see the SQL Server error above)."

docker compose exec -T "$SERVICE" rm -f "$REMOTE" || true

echo
echo "Checking what came back …"
printf '%s\n' "SET NOCOUNT ON;
SELECT 'properties = ' + CAST(COUNT(*) AS varchar(20)) FROM [${TARGET}].realestate.Properties;
SELECT 'leads      = ' + CAST(COUNT(*) AS varchar(20)) FROM [${TARGET}].realestate.Leads;
SELECT 'admins     = ' + CAST(COUNT(*) AS varchar(20)) FROM [${TARGET}].auth.Admins;" \
  | sql -h -1 || echo "  (counts unavailable — check the table names if the schema has moved on)"

echo
if [ "$MODE" = "--into-live" ]; then
  echo "Done. Start the application again:  docker compose start backend"
else
  cat <<DONE
Done. The backup restored cleanly into the scratch database ${TARGET};
the live database was not touched.

Drop the scratch copy when you are satisfied:
  docker compose exec ${SERVICE} /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa \\
    -P "\$MSSQL_SA_PASSWORD" -C -Q "DROP DATABASE [${TARGET}];"
DONE
fi
