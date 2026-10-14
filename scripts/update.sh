#!/usr/bin/env bash
# =========================================================================================
# Update a running deployment, safely.
#
#     cd /opt/qre && sudo ./scripts/update.sh
#
# The documented update was three commands run by hand:
#
#     git pull && docker compose build && docker compose up -d
#
# which works, and has no safety net. Nothing takes a backup first. Nothing checks the site
# still works afterwards. And when a change turns out to be broken, getting back to the
# version that worked means knowing which commit that was -- on a live site, while it is
# down, which is the worst moment to be looking it up.
#
# This does the same three things in the right order, with the parts a person forgets:
#
#   1. records the commit that is running now, so there is always a way back
#   2. backs up the database BEFORE anything changes
#   3. pulls, and stops early if there is nothing new
#   4. builds -- and a build failure here costs nothing, because building does not touch
#      the running containers. The site stays up on the old version.
#   5. starts the new containers
#   6. checks the site AND the API actually answer
#   7. if they do not, puts the previous commit back, rebuilds, and restarts
#
# What it never does: delete a volume. The database is not touched by any step here.
# =========================================================================================
set -euo pipefail

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mfailed: %s\033[0m\n' "$*" >&2; exit 1; }

# -----------------------------------------------------------------------------------------
# 0. Where are we, and can we do this
# -----------------------------------------------------------------------------------------
[ -f docker-compose.yml ] && [ -f .env ] \
  || die "run this from the deployment directory (the one holding docker-compose.yml and .env):
    cd /opt/qre && sudo ./scripts/update.sh"

command -v docker >/dev/null || die "docker is not installed here."
docker compose version >/dev/null 2>&1 || die "the docker compose plugin is missing."
command -v git >/dev/null || die "git is not installed here."

git rev-parse --git-dir >/dev/null 2>&1 || die "this is not a git checkout, so there is nothing to pull."

# Local edits would be destroyed by the rollback's `git reset --hard`, so refuse to start
# rather than quietly take them away from whoever made them.
# .deployed-commit is excluded: this script writes it, and a script that trips over its own
# state file refuses to run from the second time onwards. .gitignore covers it too, but not
# on a checkout that predates that entry -- which is exactly the deployment this guard would
# have locked out.
DIRTY="$(git status --porcelain | grep -v '[[:space:]]\.deployed-commit$' || true)"
if [ -n "$DIRTY" ]; then
  printf '%s\n' "$DIRTY" | sed 's/^/    /'
  die "there are uncommitted changes in this directory.

    Updating would overwrite them, and a rollback would delete them for good.
    Commit them, or undo them with 'git checkout -- .', then run this again."
fi

PREV="$(git rev-parse HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
bold "Updating $(pwd) on branch ${BRANCH}"
echo "    currently running: $(git log -1 --format='%h  %s' | cut -c1-72)"

# -----------------------------------------------------------------------------------------
# 1. Back up first
# -----------------------------------------------------------------------------------------
# Before, not after. An update that corrupts data is rare; an update that is rolled back
# while someone was adding a listing is not, and the backup is what makes that recoverable.
step "Backing up the database first"
if [ "${SELF_REEXECED:-0}" = "1" ]; then
  echo "    already taken by the run that restarted this one — not repeating it."
elif [ "${SKIP_BACKUP:-0}" = "1" ]; then
  warn "SKIP_BACKUP=1 — no backup is being taken. If this update goes wrong, there is
    nothing to restore from."
elif [ ! -x ./scripts/backup-db.sh ]; then
  warn "scripts/backup-db.sh is missing or not executable — continuing without a backup."
elif ./scripts/backup-db.sh >/tmp/qre-update-backup.log 2>&1; then
  echo "    done: $(ls -t backups/*.bak 2>/dev/null | head -1 || echo 'see ./backups')"
else
  tail -15 /tmp/qre-update-backup.log | sed 's/^/    /'
  die "the backup failed, so the update stopped before changing anything.

    Fix the backup first -- updating without one is the risk this script exists to remove.
    To update anyway, knowing there is no backup:  SKIP_BACKUP=1 sudo ./scripts/update.sh"
fi

# -----------------------------------------------------------------------------------------
# 2. Pull
# -----------------------------------------------------------------------------------------
step "Fetching the latest code"
git fetch --quiet origin "$BRANCH" || die "could not reach the git remote. Check the server's network."

BEHIND="$(git rev-list --count "HEAD..origin/${BRANCH}")"

# "No new commits" is NOT the same as "nothing to deploy", and treating them as the same
# wasted a deploy. Running `git pull` before this script -- which the documented one-liner
# literally told people to do, in order to pick up this script's own latest version --
# advances the working tree while the containers carry on serving the previous build. This
# then compared HEAD against the remote, found them equal, reported "already up to date" and
# exited without building. Files updated, site unchanged, and nothing said so.
#
# So the question is not "is the checkout behind the remote" but "is what is RUNNING the same
# as what is checked out". DEPLOYED records the commit of the last successful deploy, written
# at the end of this script, which makes that comparison possible at all.
DEPLOYED_FILE=".deployed-commit"
DEPLOYED="$(cat "$DEPLOYED_FILE" 2>/dev/null || true)"

if [ "$BEHIND" = "0" ]; then
  if [ "${FORCE_REBUILD:-0}" = "1" ]; then
    echo "    no new commits, but FORCE_REBUILD=1 — rebuilding anyway."
  elif [ -z "$DEPLOYED" ]; then
    # No record: either this is the first run of this version of the script, or someone
    # deployed by hand. Build rather than assume -- a needless rebuild costs minutes, a
    # skipped one leaves the site on code nobody can see is stale.
    echo "    no new commits, but there is no record of what is deployed."
    echo "    rebuilding so that what runs is certain to be what is checked out."
  elif [ "$DEPLOYED" != "$(git rev-parse HEAD)" ]; then
    echo "    no new commits, but the running site is on ${DEPLOYED:0:7} and the code is on"
    echo "    $(git rev-parse --short HEAD) — someone pulled without deploying. Building that now."
  else
    echo "    already up to date, and ${DEPLOYED:0:7} is what is running."
    echo
    bold "No change. The site was not touched."
    echo "    To rebuild anyway:  FORCE_REBUILD=1 sudo ./scripts/update.sh"
    exit 0
  fi
else
  echo "    ${BEHIND} new commit(s):"
  git log --format='      %h  %s' "HEAD..origin/${BRANCH}" | cut -c1-78
fi

git merge --ff-only "origin/${BRANCH}" --quiet \
  || die "the branch has diverged from the remote, so this cannot fast-forward.
    Sort the history out by hand; nothing has been changed and the site is still running."

NEW="$(git rev-parse HEAD)"

# ----------------------------------------------------------------------------------------
# If the pull changed THIS script, start again as the new one.
#
# Without this the script can never deploy a fix to itself, and the failure is a loop rather
# than an error. It begins as the old version, pulls the new one, and carries on running the
# old logic to the end -- then, if it rolls back, `git reset --hard` deletes the very fix it
# just fetched. The next run begins as the old version again. Forever.
#
# That is not hypothetical: a one-line fix to the checks below took three runs to land,
# twice reporting a failure that the fix had already corrected.
#
# exec replaces this process, so nothing returns here. SELF_REEXECED stops a pair of
# versions bouncing between each other if one ever disagrees about what changed.
# ----------------------------------------------------------------------------------------
if [ "${SELF_REEXECED:-0}" != "1" ] && ! git diff --quiet "$PREV" "$NEW" -- "$0"; then
  echo
  echo "    this script changed in that pull — restarting as the new version."
  SELF_REEXECED=1 exec "$0" "$@"
fi

# -----------------------------------------------------------------------------------------
# 3. Build
# -----------------------------------------------------------------------------------------
# The safest step in the script: `build` produces images and leaves the running containers
# completely alone. If the new code does not compile, the site carries on serving the old
# version and all we have to undo is the git pull.
step "Building (the site stays up on the old version while this runs)"
if ! docker compose build 2>&1 | tail -25; then
  git reset --hard "$PREV" --quiet
  die "the build failed, so nothing was deployed.

    The site is still running the previous version, untouched, and the code
    has been put back to ${PREV:0:7}. Nothing to clean up."
fi

# -----------------------------------------------------------------------------------------
# 4. Start
# -----------------------------------------------------------------------------------------
step "Starting the new version"
docker compose up -d 2>&1 | tail -12

# -----------------------------------------------------------------------------------------
# 5. Does it actually work
# -----------------------------------------------------------------------------------------
# "The containers started" is not the same as "the site works": a container can be up and
# still be answering 500 on every request. These check what a visitor would actually get.
step "Checking the site really is serving"

# Where to knock depends on whether TLS is on: with it, nginx is bound to localhost only and
# Caddy holds 443; without it, nginx has port 80.
SITE_ADDRESS="$(grep -E '^SITE_ADDRESS=' .env | cut -d= -f2- | cut -d, -f1 | tr -d ' ' || true)"
PROFILES="$(grep -E '^COMPOSE_PROFILES=' .env | cut -d= -f2- | tr -d ' ' || true)"

if [ "$PROFILES" = "tls" ] && [ -n "$SITE_ADDRESS" ]; then
  CURL_BASE=(curl -fsS --max-time 15 --resolve "${SITE_ADDRESS}:443:127.0.0.1")
  ROOT="https://${SITE_ADDRESS}"
else
  CURL_BASE=(curl -fsS --max-time 15)
  ROOT="http://127.0.0.1"
fi

OK=1

# The page itself. Up to ~90s because SQL Server is slow to accept connections after a
# restart and the API waits for it.
printf '    the site      '
for i in $(seq 1 30); do
  if "${CURL_BASE[@]}" -o /dev/null "${ROOT}/" 2>/dev/null; then echo "answers"; break; fi
  [ "$i" = 30 ] && { echo "NO RESPONSE"; OK=0; }
  sleep 3
done

# The API, which is the half that talks to the database. A static page would load fine with
# the backend down, so checking the page alone proves very little.
printf '    the API       '
# Retried on the same budget as the page above, and the reason is that the two come up at
# very different speeds. nginx is serving static files, so it answers seconds after the
# container starts; the API has to wait for SQL Server to accept connections and then do its
# own startup. Asking it once, immediately after a restart, times the question to arrive
# while it is still booting.
#
# This asked once. It rolled back a deployment that was fine -- a false alarm that costs a
# good release and sends someone hunting a failure that never happened, which is worse than
# the missing check was, because it looks like evidence.
API=""
for i in $(seq 1 30); do
  API="$("${CURL_BASE[@]}" "${ROOT}/api/properties?page=1&pageSize=1" 2>/dev/null || true)"
  case "$API" in *totalCount*|*items*) break ;; esac
  sleep 3
done
case "$API" in
  *totalCount*|*items*) echo "answers" ;;
  "")                   echo "NO RESPONSE after 90s"; OK=0 ;;
  *)                    echo "answered, but not with a listing page"; OK=0 ;;
esac

# -----------------------------------------------------------------------------------------
# 6. Roll back if it does not
# -----------------------------------------------------------------------------------------
if [ "$OK" = "0" ]; then
  warn "the new version is not serving properly — putting the previous one back."
  echo

  step "Rolling back to ${PREV:0:7}"
  git reset --hard "$PREV" --quiet
  printf '%s\n' "$PREV" > "$DEPLOYED_FILE"
  if docker compose build >/dev/null 2>&1 && docker compose up -d >/dev/null 2>&1; then
    sleep 10
    if "${CURL_BASE[@]}" -o /dev/null "${ROOT}/" 2>/dev/null; then
      echo "    the previous version is back up."
    else
      warn "the previous version is not answering either. Check: docker compose logs --tail 80"
    fi
  else
    warn "the rollback build failed. Check: docker compose ps && docker compose logs --tail 80"
  fi

  cat >&2 <<ROLLED

$(bold "Update rolled back.")

    The site is on ${PREV:0:7} again — the version that was running before.
    Your data was not touched at any point, and the backup from the start of
    this run is in ./backups.

    What the new version did wrong is in the logs:
        docker compose logs --tail 80 backend
        docker compose logs --tail 40 frontend

ROLLED
  exit 1
fi

# -----------------------------------------------------------------------------------------
# 7. Done
# -----------------------------------------------------------------------------------------
# Written only now, after the checks passed: this file means "this commit is built, running
# and answering", which is what the next run needs to know. Writing it before the checks
# would have it claim a deploy that may have just been rolled back.
printf '%s\n' "$(git rev-parse HEAD)" > "$DEPLOYED_FILE"

cat <<DONE

$(bold "Updated.")

    Now running   $(git log -1 --format='%h  %s' | cut -c1-66)
    Was running   ${PREV:0:7}
    Site          ${ROOT}
    Backup        ./backups  (taken before the update)

$(bold "If something looks wrong")

    Go back to the previous version:
        git reset --hard ${PREV:0:7} && docker compose build && docker compose up -d

DONE
