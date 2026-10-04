#!/usr/bin/env bash
# =========================================================================================
# Bring the LOCAL stack up and say plainly what happened.
#
#     ./scripts/up.sh              # build what changed, start, wait, report
#     ./scripts/up.sh --fresh      # rebuild from scratch, ignoring Docker's layer cache
#     ./scripts/up.sh --no-build   # just restart what is already built
#
# Why this exists: bringing the stack up and finding out why it did not come up was a dozen
# separate commands — build, up, sleep, ps, logs, grep — run one at a time, with the real
# cause buried somewhere in the output. This does all of it once and ends with a verdict.
#
# Everything it learns is written to .cowork-local/up-report.txt, which is a single file
# you can hand to someone (or to Claude) instead of pasting terminal output.
# =========================================================================================
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"
REPORT="$ROOT/.cowork-local/up-report.txt"
mkdir -p "$ROOT/.cowork-local"

BUILD=1
FRESH=0
for a in "$@"; do
  case "$a" in
    --fresh)    FRESH=1 ;;
    --no-build) BUILD=0 ;;
    -h|--help)  sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "Unknown option: $a (try --help)" >&2; exit 2 ;;
  esac
done

if [ -t 1 ]; then B=$'\033[1m'; R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; N=$'\033[0m'
else B=''; R=''; G=''; Y=''; N=''; fi
step() { printf '\n%s==> %s%s\n' "$B" "$*" "$N"; }
ok()   { printf '%s  ok%s  %s\n' "$G" "$N" "$*"; }
warn() { printf '%s  !! %s %s\n' "$Y" "$N" "$*"; }

# Everything from here also lands in the report.
: > "$REPORT"
say() { printf '%s\n' "$*" | tee -a "$REPORT" >/dev/null; }
run() { printf '\n$ %s\n' "$*" >> "$REPORT"; "$@" 2>&1 | tee -a "$REPORT"; }

say "=== up.sh — $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
say "repo: $ROOT"
say "branch: $(git branch --show-current 2>/dev/null || echo '?')"

command -v docker >/dev/null || { echo "docker is not installed or not on PATH." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is installed but not running. Start Docker Desktop." >&2; exit 1; }
[ -f .env ] || { echo "No .env next to docker-compose.yml." >&2; exit 1; }

# ---- file modes --------------------------------------------------------------------------
# A file that arrives with 0600 is copied into the image with 0600, and the app runs as a
# different user than the one that owns it, so it cannot read its own appsettings.json and
# dies before it listens. Dockerfile.backend now normalises this itself; this keeps the
# build context clean anyway, and it is free.
step "Normalising file permissions in the build context"
FIXED=$(find src frontend docker Dockerfile.backend Dockerfile.frontend docker-compose.yml \
          -type f ! -perm -004 -print 2>/dev/null | tee -a "$REPORT" | wc -l | tr -d ' ')
find src frontend docker Dockerfile.backend Dockerfile.frontend docker-compose.yml \
     -type f ! -perm -004 -exec chmod a+r {} + 2>/dev/null || true
[ "$FIXED" = "0" ] && ok "nothing to fix" || ok "made $FIXED file(s) world-readable"

# ---- build -------------------------------------------------------------------------------
if [ "$BUILD" = 1 ]; then
  if [ "$FRESH" = 1 ]; then
    step "Building from scratch (--fresh: no layer cache; this takes several minutes)"
    run docker compose build --no-cache backend frontend
  else
    step "Building what changed"
    run docker compose build backend frontend
  fi
  ok "images built"
else
  warn "skipping build (--no-build)"
fi

# ---- start -------------------------------------------------------------------------------
step "Starting the stack"
run docker compose up -d
run docker compose ps

# ---- wait for the API --------------------------------------------------------------------
step "Waiting for the API (up to 3 minutes — the first start applies migrations)"
UP=0
for _ in $(seq 1 90); do
  if curl -fsS http://localhost/api/catalog/property-types >/dev/null 2>&1; then UP=1; break; fi
  sleep 2
done

say ""
say "=== backend logs (last 120) ==="
docker compose logs backend --tail 120 >> "$REPORT" 2>&1 || true
LOGS="$(docker compose logs backend --tail 120 2>&1 || true)"

# ---- verdict -------------------------------------------------------------------------------
step "Verdict"
verdict() { printf '\n%s\n' "$1" | tee -a "$REPORT"; }

if [ "$UP" = 1 ]; then
  COUNT=$(curl -fsS 'http://localhost/api/properties?page=1&pageSize=1' 2>/dev/null \
          | python3 -c 'import json,sys; print(json.load(sys.stdin).get("totalCount","?"))' 2>/dev/null || echo '?')
  printf '%s  ok%s  the API is up on http://localhost\n' "$G" "$N"
  verdict "RESULT: UP. Published listings visible to the public: ${COUNT}"
  say ""
  say "=== what the seeder did this start ==="
  printf '%s' "$LOGS" | grep -iE "Seed:|already applied|Demo content|deprecated" | tee -a "$REPORT" || say "(nothing — already recorded in SeedHistory)"
  echo
  ok "report written to .cowork-local/up-report.txt"
  exit 0
fi

printf '%s  !!%s  the API did not come up. Reading the logs…\n' "$R" "$N"

# The failures that have actually happened here, each with the fix rather than a guess.
if printf '%s' "$LOGS" | grep -q "is denied"; then
  verdict "CAUSE: the app cannot READ one of its own files inside the image (a file-mode problem,
not a code problem). Dockerfile.backend contains a 'chmod -R a+rX /app' that fixes this — if
you are seeing it anyway, Docker reused a cached layer from before that line existed.

FIX:  ./scripts/up.sh --fresh"

elif printf '%s' "$LOGS" | grep -qE "PendingModelChangesWarning|model drift"; then
  verdict "CAUSE: EF refuses to migrate — the entity configuration and the migration snapshot
disagree. The database schema is probably fine; the snapshot bookkeeping is not.

FIX:  ask EF what is missing. This writes FILES ONLY and never touches a database:

  docker run --rm -v \"\$PWD\":/src -w /src mcr.microsoft.com/dotnet/sdk:10.0 bash -c \\
    'dotnet tool install dotnet-ef --tool-path /src/.cowork-local/tools >/dev/null &&
     dotnet restore src/Host/Host.csproj >/dev/null &&
     /src/.cowork-local/tools/dotnet-ef migrations add WhatIsMissing \\
       --project src/Modules/RealEstate/RealEstate.Infrastructure \\
       --startup-project src/Host --context RealEstateDbContext --output-dir Data/Migrations'

Then read the generated Up(). Empty Up() means only the snapshot was stale and EF has now
rewritten it correctly — keep the migration and run ./scripts/up.sh again."

elif printf '%s' "$LOGS" | grep -q "Invalid object name"; then
  verdict "CAUSE: the app is querying a table or column the database does not have — a migration
did not apply. The log line above names the object.

FIX:  ./scripts/up.sh --fresh, and if it persists send .cowork-local/up-report.txt."

elif printf '%s' "$LOGS" | grep -qE "Login failed for user|password.*not correct"; then
  verdict "CAUSE: the API cannot log in to SQL Server. SA_PASSWORD in .env does not match the
password the sqlserver container was first created with — that password is baked into the
data volume on its very first start and does not change afterwards.

FIX:  put the original password back in .env, or recreate the database from a backup:
      docker compose down && docker volume rm qre_mssql-data && ./scripts/up.sh
      ./scripts/restore-db.sh backups/<file>.bak --into-live
      ^ ONLY with a backup in hand: removing that volume deletes every listing and lead."

elif printf '%s' "$LOGS" | grep -qE "network-related or instance-specific|No such host"; then
  verdict "CAUSE: the API cannot reach SQL Server at all.

FIX:  docker compose ps — is qre-sqlserver healthy? If it is restarting, read its own log:
      docker compose logs sqlserver --tail 80"

elif [ -z "$LOGS" ]; then
  verdict "CAUSE: the backend produced no log output at all — it probably never started.

FIX:  docker compose ps, then: docker compose logs --tail 80"

else
  verdict "CAUSE: not one of the failures this script knows. The last 120 log lines are in the
report; the first 'Unhandled exception' or 'ERR' line in it is the real one."
fi

verdict "
The full report is at .cowork-local/up-report.txt — send that file rather than pasting
terminal output; it has the build, the container states and the logs together."
exit 1
