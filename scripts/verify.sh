#!/usr/bin/env bash
# =========================================================================================
# One command that checks the whole project.
#
#     ./scripts/verify.sh
#
# It runs four things and stops at the first failure:
#
#   1. BACKEND BUILD    — compiles every C# project in Docker (the real compiler, the real
#                         NuGet restore). This is the check that a code change did not break
#                         the build.
#   2. BACKEND TESTS    — the xUnit suites under tests/.
#   3. FRONTEND         — npm ci, the Vite production build, and the frontend tests.
#   4. PERSISTENCE E2E  — the thing that was actually broken: seed demo data, delete some of
#                         it through the API, restart the application, and check it is still
#                         gone. Then create a listing, restart, and check it is still there.
#
# YOUR DATA IS NOT TOUCHED.
# Step 4 runs against docker-compose.test.yml, which is its own compose project
# (`qre-verify`), its own database (QatarRealEstateVerify), its own volume
# (qre-verify_verify-mssql-data) and its own port (18080). The live stack is never started,
# stopped or read. The test volume is deleted at the end of every run, pass or fail.
#
# Options:
#   --skip-frontend     don't touch npm
#   --skip-e2e          build and unit-test only (no Docker stack, much faster)
#   --keep              leave the verification stack running afterwards, to poke at it
# =========================================================================================
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"

SKIP_FRONTEND=0
SKIP_E2E=0
KEEP=0
for arg in "$@"; do
  case "$arg" in
    --skip-frontend) SKIP_FRONTEND=1 ;;
    --skip-e2e)      SKIP_E2E=1 ;;
    --keep)          KEEP=1 ;;
    -h|--help)       sed -n '2,28p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

# ---- output helpers ---------------------------------------------------------------------
if [ -t 1 ]; then B=$'\033[1m'; R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; N=$'\033[0m'
else B=''; R=''; G=''; Y=''; N=''; fi
step()  { printf '\n%s==> %s%s\n' "$B" "$*" "$N"; }
ok()    { printf '%s  ok%s  %s\n' "$G" "$N" "$*"; }
warn()  { printf '%s  !! %s %s\n' "$Y" "$N" "$*"; }
die()   { printf '\n%sFAILED:%s %s\n' "$R" "$N" "$*" >&2; exit 1; }

COMPOSE_TEST=(docker compose -f "$ROOT/docker-compose.test.yml")
API_PORT="${VERIFY_API_PORT:-18080}"
API="http://localhost:${API_PORT}"
ADMIN_EMAIL="${VERIFY_ADMIN_EMAIL:-verify@example.test}"
ADMIN_PASSWORD="${VERIFY_ADMIN_PASSWORD:-Verify123}"

STACK_UP=0
cleanup() {
  local code=$?
  if [ "$STACK_UP" = 1 ] && [ "$KEEP" = 0 ]; then
    step "Tearing down the verification stack (and deleting its database volume)"
    "${COMPOSE_TEST[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
    ok "verification data removed"
  elif [ "$STACK_UP" = 1 ]; then
    warn "stack left running on ${API} (--keep). Remove it with:"
    warn "  docker compose -f docker-compose.test.yml down -v"
  fi
  exit $code
}
trap cleanup EXIT

need() { command -v "$1" >/dev/null 2>&1 || die "$1 is not installed or not on PATH."; }

# =========================================================================================
step "Checking the tools this script needs"
# =========================================================================================
need docker
docker info >/dev/null 2>&1 || die "Docker is installed but not running. Start Docker Desktop and try again."
docker compose version >/dev/null 2>&1 || die "'docker compose' is unavailable (Compose v2 required)."
ok "docker $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo '?')"
if [ "$SKIP_E2E" = 0 ]; then need curl; need python3; fi
if [ "$SKIP_FRONTEND" = 0 ]; then need npm; fi

# =========================================================================================
step "1/4  Building the backend (full C# compile)"
# =========================================================================================
# Building the image IS the compile check: Dockerfile.backend restores every package and
# runs `dotnet publish`, which fails the build on any compiler error.
docker build -f "$ROOT/Dockerfile.backend" -t qre-backend:verify "$ROOT" \
  || die "the backend does not compile — scroll up for the first C# error."
ok "backend compiles"

# =========================================================================================
step "2/4  Backend tests"
# =========================================================================================
if [ -d "$ROOT/tests" ] && compgen -G "$ROOT/tests/*/*.csproj" >/dev/null; then
  # Run inside the SDK image so no local .NET install is needed. The NuGet cache is a named
  # volume, so a second run does not re-download every package.
  # --user: the container writes bin/, obj/ and TestResults/ straight into the mounted
  # working tree. As root that leaves files the user cannot delete or rebuild without sudo.
  # HOME is redirected because .NET writes its first-run state there and an unmapped UID has
  # no home directory.
  #
  # Docker creates a named volume's mount point as root:root and does NOT chown it to match
  # --user, so the unprivileged container could not write the package cache at all and the
  # first restore died with "Access to the path '/nuget' is denied" — which this script would
  # then have reported as a failing test. One privileged chown fixes it, once.
  docker run --rm --user root \
    -v qre-verify-nuget:/nuget \
    mcr.microsoft.com/dotnet/sdk:10.0 \
    chown -R "$(id -u):$(id -g)" /nuget \
    || die "could not prepare the NuGet cache volume."

  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e HOME=/tmp -e NUGET_PACKAGES=/nuget \
    -v "$ROOT":/src -w /src \
    -v qre-verify-nuget:/nuget \
    mcr.microsoft.com/dotnet/sdk:10.0 \
    dotnet test QatarRealEstate.slnx --nologo -v minimal \
    || die "backend tests failed — the report above names the failing test."
  ok "backend tests passed"
else
  warn "no test projects under tests/ — skipping"
fi

# =========================================================================================
step "3/4  Frontend"
# =========================================================================================
if [ "$SKIP_FRONTEND" = 1 ]; then
  warn "skipped (--skip-frontend)"
else
  pushd "$ROOT/frontend" >/dev/null
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund || die "npm ci failed."
  else
    npm install --no-audit --no-fund || die "npm install failed."
  fi
  ok "dependencies installed"

  if npm run 2>/dev/null | grep -qE '^ +lint$'; then
    npm run lint || die "eslint reported problems."
    ok "lint clean"
  fi

  if npm run 2>/dev/null | grep -qE '^ +test$'; then
    npm test -- --run || die "frontend tests failed."
    ok "frontend tests passed"
  else
    warn "no frontend test script — skipping"
  fi

  npm run build || die "the frontend production build failed."
  ok "frontend builds"
  popd >/dev/null
fi

# =========================================================================================
step "4/4  Persistence: does a delete actually stick?"
# =========================================================================================
if [ "$SKIP_E2E" = 1 ]; then
  warn "skipped (--skip-e2e)"
  step "Done"
  ok "everything that ran, passed"
  exit 0
fi

# Small JSON helpers. python3 rather than jq, because python3 ships with macOS and jq does
# not — one less thing to install before this script will run.
json() { python3 -c 'import json,sys; d=json.load(sys.stdin); print(eval("d"+sys.argv[1]))' "$1"; }

api() {  # api METHOD PATH [BODY]  → body on stdout, dies on a non-2xx status
  local method="$1" path="$2" body="${3:-}" out status
  # An array, not ${TOKEN:+-H "..."} — an unquoted expansion splits on the space inside the
  # header and curl receives four broken arguments instead of two.
  #
  # The +"${auth[@]}" form matters: under `set -u`, bash 3.2 treats "${arr[@]}" on an EMPTY
  # array as an unbound variable and aborts. macOS still ships bash 3.2 at /bin/bash, and the
  # first call here is the login, when the array IS empty — so the plain form passed on CI
  # (bash 5) and died on the machine this script exists for.
  local -a auth=()
  [ -n "${TOKEN:-}" ] && auth=(-H "Authorization: Bearer $TOKEN")
  out="$(mktemp)"
  if [ -n "$body" ]; then
    status=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "${API}${path}" \
      -H 'Content-Type: application/json' ${auth[@]+"${auth[@]}"} -d "$body")
  else
    status=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "${API}${path}" ${auth[@]+"${auth[@]}"})
  fi
  if [ "${status:0:1}" != "2" ]; then
    printf '%s %s -> HTTP %s\n%s\n' "$method" "$path" "$status" "$(cat "$out")" >&2
    rm -f "$out"; return 1
  fi
  cat "$out"; rm -f "$out"
}

wait_for_api() {
  local tries=90
  until curl -fsS "${API}/api/catalog/property-types" >/dev/null 2>&1; do
    tries=$((tries - 1))
    if [ "$tries" -le 0 ]; then
      local logs; logs="$("${COMPOSE_TEST[@]}" logs --tail 80 backend 2>&1 || true)"
      printf '%s\n' "$logs"
      # Name the one failure that looks like "the API is just slow" but never recovers.
      # A migration or its .Designer.cs edited by hand is easy to get subtly wrong — a
      # property added under the wrong entity, say — and EF then refuses to migrate at all.
      # Without this the script blames a timeout and the real message scrolls past.
      if printf '%s' "$logs" | grep -q 'PendingModelChangesWarning\|model drift'; then
        die "EF refused to migrate: the model and the migration snapshot disagree.
  A hand-written migration or ModelSnapshot.cs is out of step with the entity configuration.
  Ask EF what is missing (it writes files only, it does not touch any database):

    docker run --rm -v \"\$PWD\":/src -w /src mcr.microsoft.com/dotnet/sdk:10.0 bash -c \\
      'dotnet tool install dotnet-ef --tool-path /src/.tools >/dev/null &&
       dotnet restore src/Host/Host.csproj >/dev/null &&
       /src/.tools/dotnet-ef migrations add WhatIsMissing \\
         --project src/Modules/RealEstate/RealEstate.Infrastructure \\
         --startup-project src/Host --context RealEstateDbContext --output-dir Data/Migrations'

  Read the generated Up() — it IS the diff. Fix the snapshot, then delete that migration."
      fi
      die "the API never came up on ${API}."
    fi
    sleep 2
  done
}

published_count() {  # public search total — what a visitor actually sees
  api GET '/api/properties?page=1&pageSize=1' | json "['totalCount']"
}
admin_count() {
  api GET '/api/admin/properties?page=1&pageSize=1' | json "['totalCount']"
}

# ---- a clean slate ----------------------------------------------------------------------
"${COMPOSE_TEST[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
STACK_UP=1
"${COMPOSE_TEST[@]}" up -d --no-build sqlserver || die "could not start the test database."
"${COMPOSE_TEST[@]}" up -d --no-build backend   || die "could not start the test backend."
wait_for_api
ok "isolated stack up on ${API} (database QatarRealEstateVerify)"

TOKEN=""
TOKEN=$(api POST /api/auth/login "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
        | json "['accessToken']") || die "could not log in as the Main Admin."
ok "logged in as the Main Admin"

# ---- 4a. demo data is NOT seeded automatically -------------------------------------------
# This is the regression guard for the reported bug's root cause. A fresh start with the
# bootstrap flags on must produce ZERO listings: reference data yes, invented listings no.
before=$(admin_count)
[ "$before" = "0" ] || die "a fresh deployment already has ${before} listings. Demo content is being seeded automatically again — that is the bug this was meant to fix."
ok "a fresh deployment starts with no listings"

# ---- 4b. seed the demo content on purpose ------------------------------------------------
"${COMPOSE_TEST[@]}" run --rm backend seed --demo \
  || die "the explicit demo seed command failed."
"${COMPOSE_TEST[@]}" restart backend >/dev/null
wait_for_api
seeded=$(admin_count)
[ "$seeded" -gt 0 ] || die "'seed --demo' reported success but inserted no listings."
ok "seed --demo inserted ${seeded} listings"

# ---- 4c. running it again must NOT insert a second copy -----------------------------------
"${COMPOSE_TEST[@]}" run --rm backend seed --demo >/dev/null \
  || die "the second demo seed command failed."
again=$(admin_count)
[ "$again" = "$seeded" ] || die "running 'seed --demo' twice changed the count from ${seeded} to ${again}. The run-once ledger is not working."
ok "running it twice is a no-op (${again} listings)"

# ---- 4d. delete, restart, and check it stayed deleted -------------------------------------
# The exact scenario reported: delete the demo data, refresh, and watch it come back.
ids=$(api GET '/api/admin/properties?page=1&pageSize=5' | python3 -c \
  'import json,sys; print(" ".join(i["id"] for i in json.load(sys.stdin)["items"]))')
[ -n "$ids" ] || die "could not read any listing ids back."
deleted=0
for id in $ids; do api DELETE "/api/admin/properties/${id}" >/dev/null || die "delete failed for ${id}"; deleted=$((deleted + 1)); done
after_delete=$(admin_count)
[ "$after_delete" = "$((seeded - deleted))" ] || die "deleted ${deleted} listings but the count went ${seeded} -> ${after_delete}."
ok "deleted ${deleted} listings"

step "     restarting the application (this is the 'refresh' that used to bring them back)"
"${COMPOSE_TEST[@]}" restart backend >/dev/null
wait_for_api
after_restart=$(admin_count)
[ "$after_restart" = "$after_delete" ] || die "THE BUG IS BACK: ${after_delete} listings before the restart, ${after_restart} after. Something is re-inserting deleted rows."
ok "still ${after_restart} after a restart — the delete stuck"

for id in $ids; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "${API}/api/admin/properties/${id}")
  [ "$code" = "404" ] || die "deleted listing ${id} still answers with HTTP ${code} after the restart."
done
ok "each deleted listing is gone individually, not just missing from a count"

# ---- 4e. a NEW listing survives a restart --------------------------------------------------
type_id=$(api GET /api/catalog/property-types | json "[0]['id']")
new_title="verify-persistence-$(date +%s)"
new_id=$(api POST /api/admin/properties "$(cat <<JSON
{
  "title": "${new_title}",
  "description": "Created by scripts/verify.sh to prove writes persist.",
  "propertyTypeId": "${type_id}",
  "listingKind": "Sale",
  "location": { "country":"Qatar","city":"Doha","street":"Verify Street","postalCode":"00000",
                "state":"Doha","x":"51.5310","y":"25.2854","description":null },
  "sale": { "price": { "amount": 1500000, "currency": "QAR" }, "paymentMethod": "Cash", "installment": null },
  "rent": null,
  "specs": { "numberOfRooms": 3, "areaInSquareMeters": 180, "bathrooms": 2 }
}
JSON
)" | json "['id']")
[ -n "$new_id" ] || die "creating a listing returned no id."
api POST "/api/admin/properties/${new_id}/publication" '{"action":"Publish"}' >/dev/null \
  || die "could not publish the new listing."
ok "created and published a listing"

"${COMPOSE_TEST[@]}" restart backend >/dev/null
wait_for_api
found=$(api GET "/api/admin/properties/${new_id}" | json "['title']")
[ "$found" = "$new_title" ] || die "the new listing did not survive the restart (got '${found}')."
public_total=$(published_count)
[ "$public_total" -gt 0 ] || die "the listing was published but the public search returns nothing."
ok "the new listing is still there after a restart, and visible publicly"

# ---- 4f. an edit survives a restart -------------------------------------------------------
edited="${new_title}-edited"
api PUT "/api/admin/properties/${new_id}" "$(cat <<JSON
{
  "title": "${edited}",
  "description": "Edited by scripts/verify.sh.",
  "propertyTypeId": "${type_id}",
  "listingKind": "Sale",
  "location": { "country":"Qatar","city":"Doha","street":"Verify Street","postalCode":"00000",
                "state":"Doha","x":"51.5310","y":"25.2854","description":null },
  "sale": { "price": { "amount": 1750000, "currency": "QAR" }, "paymentMethod": "Cash", "installment": null },
  "rent": null,
  "specs": { "numberOfRooms": 4, "areaInSquareMeters": 200, "bathrooms": 3 }
}
JSON
)" >/dev/null || die "the edit was rejected."
"${COMPOSE_TEST[@]}" restart backend >/dev/null
wait_for_api
found=$(api GET "/api/admin/properties/${new_id}" | json "['title']")
[ "$found" = "$edited" ] || die "the edit did not survive the restart (got '${found}')."
ok "the edit survived a restart too"

step "Done"
ok "backend compiles, tests pass, frontend builds, and data persists across restarts"
