#!/usr/bin/env bash
# =========================================================================================
# Give the application its own database login, instead of sa.
#
#     ./scripts/create-db-user.sh
#
# The application connects as `sa` — the SQL Server superuser. sa can read and drop EVERY
# database on the instance, change server configuration, add logins, and turn on features
# like xp_cmdshell that run operating-system commands. The application needs none of that:
# it needs full rights on its OWN database and nothing else. Today an SQL-injection hole or
# a leaked connection string hands over the whole instance rather than one database.
#
# This creates a login called `qre_app` with db_owner on QatarRealEstate only. db_owner and
# not something smaller, because the application applies its own EF Core migrations on
# startup, which is DDL.
#
# After running it, put the printed values in .env and restart:
#     docker compose up -d --force-recreate backend
#
# sa still exists — you need it for backups and for this script. It is simply no longer what
# the application uses.
# =========================================================================================
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DB_NAME="${DB_NAME:-QatarRealEstate}"
APP_USER="${DB_USER:-qre_app}"
SERVICE="${SQLSERVER_SERVICE:-sqlserver}"

die() { echo "failed: $*" >&2; exit 1; }

command -v docker >/dev/null || die "docker is not installed."
[ -f .env ] || die "no .env next to docker-compose.yml — run this from the deployment directory."

docker compose ps --status running --services 2>/dev/null | grep -qx "$SERVICE" \
  || die "the '$SERVICE' container is not running."

# Generated here, never invented and never echoed into a shell history: it is printed once,
# at the end, for you to paste into .env.
if [ -n "${DB_PASSWORD:-}" ]; then
  APP_PASSWORD="$DB_PASSWORD"
  GENERATED=0
else
  command -v openssl >/dev/null || die "openssl is needed to generate a password (or set DB_PASSWORD yourself)."
  # SQL Server's password policy wants length plus three of four character classes. Base64
  # with the awkward characters removed, then a fixed suffix that guarantees the classes.
  APP_PASSWORD="$(openssl rand -base64 30 | tr -d '/+=\n' | head -c 28)Aa1"
  GENERATED=1
fi

sql() {
  docker compose exec -T "$SERVICE" \
    bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -i /dev/stdin'
}

echo "Creating the login '${APP_USER}' …"
# The password is interpolated into the statement, so any quote in it would break out. The
# generator above cannot produce one; a DB_PASSWORD supplied by hand is checked here.
case "$APP_PASSWORD" in
  *"'"*|*'"'*|*'`'*|*'$'*) die "DB_PASSWORD must not contain a quote, backtick or dollar sign." ;;
esac

printf '%s\n' "
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'${APP_USER}')
    CREATE LOGIN [${APP_USER}] WITH PASSWORD = N'${APP_PASSWORD}', CHECK_POLICY = ON;
ELSE
    ALTER LOGIN [${APP_USER}] WITH PASSWORD = N'${APP_PASSWORD}';

-- The database may not exist yet on a first deploy. Create it so the login has something to
-- be mapped into; the application's migrations fill it in on the next start.
IF DB_ID(N'${DB_NAME}') IS NULL CREATE DATABASE [${DB_NAME}];
" | sql || die "could not create the login."

printf '%s\n' "
USE [${DB_NAME}];
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'${APP_USER}')
    CREATE USER [${APP_USER}] FOR LOGIN [${APP_USER}];

-- db_owner on THIS database only. The application applies its own EF Core migrations at
-- startup, which is DDL, so anything narrower breaks the first deploy after a schema change.
-- What it deliberately does NOT get: any right on any other database, and no server role.
ALTER ROLE db_owner ADD MEMBER [${APP_USER}];
" | sql || die "could not map the login into ${DB_NAME}."

cat <<INFO

Done. Put these two lines in .env:

    DB_USER=${APP_USER}
    DB_PASSWORD=${APP_PASSWORD}

Then restart the API so it picks them up:

    docker compose up -d --force-recreate backend
    docker compose logs -f backend      # watch for "Now listening on"

INFO

if [ "$GENERATED" = 1 ]; then
  echo "The password above was generated just now and is NOT stored anywhere else."
  echo "Copy it into .env before closing this window."
  echo
fi

cat <<'NEXT'
What this did NOT change: sa still exists and still owns the instance. It is what
scripts/backup-db.sh uses and what this script needed. The application simply no longer
logs in as it.
NEXT
