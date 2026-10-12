#!/usr/bin/env bash
# =========================================================================================
# Turn on daily database backups.
#
#     cd /opt/qre && sudo ./scripts/install-backups.sh
#
# scripts/backup-db.sh already existed and already worked. Nothing ran it. A backup script
# nobody remembers to run is the same as no backup, and this database is not an ordinary
# one: the photos are varbinary columns, so every listing photo on the site lives in it too.
# Lose it and the business loses its listings, its photos and its leads together.
#
# This installs a cron job that runs it every night, proves the backup works by taking one
# now, and then tells you the one thing it cannot do for you -- get a copy off this machine.
#
# Safe to run more than once: it replaces its own cron line instead of adding a second.
# =========================================================================================
set -euo pipefail

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mfailed: %s\033[0m\n' "$*" >&2; exit 1; }

HOUR="${BACKUP_HOUR:-2}"
MINUTE="${BACKUP_MINUTE:-30}"
MARKER="# qre-nightly-backup"
LOG="/var/log/qre-backup.log"

[ "$(id -u)" = "0" ] || die "run this with sudo — it writes a cron job and a log in /var/log."
[ -f docker-compose.yml ] && [ -f .env ] \
  || die "run this from the deployment directory:  cd /opt/qre && sudo ./scripts/install-backups.sh"

DIR="$(pwd)"
[ -x ./scripts/backup-db.sh ] || die "scripts/backup-db.sh is missing or not executable here."
command -v crontab >/dev/null || die "cron is not installed. Install it first:  apt-get install -y cron"

bold "Nightly backups for ${DIR}"

# -----------------------------------------------------------------------------------------
# 1. Prove it works before scheduling it
# -----------------------------------------------------------------------------------------
# Scheduling first and finding out in a month that every run failed is the classic way to
# end up with a backup job and no backups. Run one now, while someone is watching.
step "Taking one backup now, to check it actually works"
if ./scripts/backup-db.sh 2>&1 | tail -8 | sed 's/^/    /'; then
  LATEST="$(ls -t "${DIR}"/backups/*.bak 2>/dev/null | head -1 || true)"
  [ -n "$LATEST" ] || die "the script finished but produced no .bak file in ./backups."
  echo "    file: $(basename "$LATEST")  ($(du -h "$LATEST" | cut -f1))"
else
  die "the backup failed. Fix that before scheduling it — scheduling a broken backup just
    hides the problem. The output above says why."
fi

# -----------------------------------------------------------------------------------------
# 2. Schedule it
# -----------------------------------------------------------------------------------------
step "Scheduling it for ${HOUR}:$(printf '%02d' "$MINUTE") every night"

touch "$LOG" && chmod 640 "$LOG"

# Replace our own line rather than appending, so running this twice does not schedule two
# backups. Matching on the marker comment, not on the command, so the line can change later.
CURRENT="$(crontab -l 2>/dev/null | grep -v "$MARKER" || true)"
LINE="${MINUTE} ${HOUR} * * *  cd ${DIR} && ./scripts/backup-db.sh >> ${LOG} 2>&1  ${MARKER}"
printf '%s\n%s\n' "$CURRENT" "$LINE" | sed '/^$/d' | crontab -

crontab -l | grep -q "$MARKER" || die "the cron line did not stick. Check: crontab -l"
echo "    installed:"
crontab -l | grep "$MARKER" | sed 's/^/      /'
echo "    log: ${LOG}"

# -----------------------------------------------------------------------------------------
# 3. The part this script cannot do
# -----------------------------------------------------------------------------------------
RETENTION="$(grep -oE 'RETENTION_DAYS:-[0-9]+' ./scripts/backup-db.sh | head -1 | cut -d- -f2 || echo 14)"

cat <<DONE

$(bold "Nightly backups are on.")

    When        every night at ${HOUR}:$(printf '%02d' "$MINUTE")
    Where       ${DIR}/backups
    Kept for    ${RETENTION} days, then deleted automatically
    Log         ${LOG}

$(bold "Two things still worth doing — neither can be done from this server")

    1. Copy the backups somewhere else. A backup on the same disk as the database
       does not survive that disk. From your own computer:

           rsync -av root@$(hostname -I 2>/dev/null | awk '{print $1}'):${DIR}/backups/ ~/qre-backups/

    2. Keep a copy of .env off this server. It holds JWT_SECRET and the database
       password, and neither can be recovered or regenerated — with the backups
       but without this file, the data cannot be brought back up. From your own
       computer, once:

           scp root@$(hostname -I 2>/dev/null | awk '{print $1}'):${DIR}/.env ~/qre-env-backup.txt

       Then put it somewhere private and delete the local copy.

$(bold "And test a restore")

    A backup nobody has restored is a guess, not a backup. The restore script
    loads into a scratch database and leaves the live one alone, so it is safe
    to try right now:

        ./scripts/restore-db.sh "$(basename "$LATEST")"

DONE
