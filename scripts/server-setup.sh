#!/usr/bin/env bash
# =========================================================================================
# First-time deployment onto a fresh Linux server, in one command.
#
#     curl -fsSL https://raw.githubusercontent.com/yahyabahig-pixel/QatarRealEstate/main/scripts/server-setup.sh | sudo bash
#
# or, if the repository is already cloned:
#
#     sudo ./scripts/server-setup.sh
#
# What it does, in order:
#   1. installs Docker, if it is missing
#   2. clones the repository into /opt/qre, if it is not there yet
#   3. writes .env — every secret generated HERE, on this machine, by openssl. It asks you
#      for the admin login and nothing else. Nothing is printed, nothing leaves the server.
#   4. builds and starts the stack
#   5. gives the application its own database login instead of sa, and restarts it
#
# Safe to re-run. An existing .env is kept as it is, never overwritten: re-running after a
# failure picks up where it stopped rather than generating new passwords behind your back.
#
# It leaves the site on plain HTTP at the server's IP address, which is the only honest
# option until a hostname exists — Let's Encrypt cannot certify an IP. Once DNS points a
# domain here, run scripts/enable-https.sh to get the certificate.
# =========================================================================================
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/yahyabahig-pixel/QatarRealEstate.git}"
TARGET_DIR="${TARGET_DIR:-/opt/qre}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mfailed: %s\033[0m\n' "$*" >&2; exit 1; }

# -----------------------------------------------------------------------------------------
# 0. Sanity
# -----------------------------------------------------------------------------------------
[ "$(id -u)" = "0" ] || die "run this with sudo — installing Docker and writing to ${TARGET_DIR} both need root."
[ "$(uname -s)" = "Linux" ] || die "this is for a Linux server. On a Mac, use RUN-UP.command instead."

command -v openssl >/dev/null || die "openssl is missing. Install it first: apt-get update && apt-get install -y openssl"

# A tty is needed for the admin prompts. `curl … | bash` gives the script no stdin of its
# own, so read from the terminal directly and fail early with a clear message if there
# isn't one, rather than silently reading the rest of the script as answers.
if [ -r /dev/tty ]; then exec 3</dev/tty; else
  die "no terminal available for the prompts. Clone the repo and run it directly:
    git clone ${REPO_URL} ${TARGET_DIR} && sudo ${TARGET_DIR}/scripts/server-setup.sh"
fi

# -----------------------------------------------------------------------------------------
# 1. Docker
# -----------------------------------------------------------------------------------------
step "Docker"
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  echo "    already installed: $(docker --version)"
else
  echo "    installing …"
  curl -fsSL https://get.docker.com | sh >/dev/null 2>&1 \
    || die "the Docker install script failed. Run it on its own to see why: curl -fsSL https://get.docker.com | sh"
  systemctl enable --now docker >/dev/null 2>&1 || true
  command -v docker >/dev/null || die "Docker still is not on PATH after installing."
  docker compose version >/dev/null 2>&1 || die "Docker installed but the compose plugin did not. Install docker-compose-plugin."
  echo "    installed: $(docker --version)"
fi

# -----------------------------------------------------------------------------------------
# 2. The code
# -----------------------------------------------------------------------------------------
step "The project"
if [ -f docker-compose.yml ] && [ -f Dockerfile.backend ]; then
  TARGET_DIR="$(pwd)"
  echo "    using the checkout this script was run from: ${TARGET_DIR}"
elif [ -d "${TARGET_DIR}/.git" ]; then
  echo "    already at ${TARGET_DIR} — fetching the latest commit"
  git -C "$TARGET_DIR" fetch --quiet origin
  git -C "$TARGET_DIR" reset --hard --quiet origin/HEAD 2>/dev/null \
    || git -C "$TARGET_DIR" reset --hard --quiet origin/main
else
  command -v git >/dev/null || { apt-get update -qq && apt-get install -y -qq git; }
  echo "    cloning into ${TARGET_DIR}"
  git clone --quiet "$REPO_URL" "$TARGET_DIR" || die "could not clone ${REPO_URL}"
fi
cd "$TARGET_DIR"
echo "    commit: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

# -----------------------------------------------------------------------------------------
# 3. .env
# -----------------------------------------------------------------------------------------
step "Settings (.env)"
if [ -f .env ]; then
  echo "    .env already exists — keeping it untouched."
  echo "    (delete it yourself if you want this script to build a fresh one)"
else
  # The public address. Compose bakes PUBLIC_ORIGIN into the JavaScript bundle at build
  # time, so it has to be right before the build, not after.
  IP="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"
  if [ -z "$IP" ]; then
    IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
    [ -n "$IP" ] && warn "could not reach an external IP service; using the interface address ${IP}."
  fi
  [ -n "$IP" ] || die "could not work out this server's IP address. Set it yourself: PUBLIC_IP=1.2.3.4 sudo ./scripts/server-setup.sh"
  IP="${PUBLIC_IP:-$IP}"
  echo "    this server's address: ${IP}"

  echo
  bold "    The admin login for the site's control panel."
  echo "    Pick these yourself — they are written straight into .env and never shown again."
  echo

  ADMIN_EMAIL=""
  while [ -z "$ADMIN_EMAIL" ]; do
    printf '    Admin email: '
    read -r ADMIN_EMAIL <&3 || die "no input."
    case "$ADMIN_EMAIL" in
      *@*.*) : ;;
      *) echo "    — that does not look like an email address."; ADMIN_EMAIL="" ;;
    esac
  done

  ADMIN_NAME=""
  while [ -z "$ADMIN_NAME" ]; do
    printf '    Admin full name: '
    read -r ADMIN_NAME <&3 || die "no input."
  done

  # Why the character restriction: docker-compose.yml passes this through as
  # ${MAIN_ADMIN_PASSWORD}, and Compose interpolates $, so a dollar sign or a quote in the
  # password would arrive at the application mangled — and you would be locked out of your
  # own panel with no error to explain it. Letters, digits and ! @ % ^ * _ - + = . ? are
  # all safe, and plenty.
  ADMIN_PASS=""
  while [ -z "$ADMIN_PASS" ]; do
    printf '    Admin password (8+ chars, with an uppercase, a lowercase and a digit): '
    read -rs ADMIN_PASS <&3 || die "no input."; echo
    printf '    Again: '
    read -rs ADMIN_PASS2 <&3 || die "no input."; echo
    if [ "$ADMIN_PASS" != "$ADMIN_PASS2" ];                 then echo "    — the two do not match."; ADMIN_PASS=""
    elif [ "${#ADMIN_PASS}" -lt 8 ];                        then echo "    — too short."; ADMIN_PASS=""
    elif ! printf '%s' "$ADMIN_PASS" | grep -q '[A-Z]';     then echo "    — needs an uppercase letter."; ADMIN_PASS=""
    elif ! printf '%s' "$ADMIN_PASS" | grep -q '[a-z]';     then echo "    — needs a lowercase letter."; ADMIN_PASS=""
    elif ! printf '%s' "$ADMIN_PASS" | grep -q '[0-9]';     then echo "    — needs a digit."; ADMIN_PASS=""
    elif printf '%s' "$ADMIN_PASS" | grep -q '[^A-Za-z0-9!@%^*_=.?+-]'; then
      echo "    — use only letters, digits and ! @ % ^ * _ - + = . ? (see the note in this script)."; ADMIN_PASS=""
    fi
  done
  unset ADMIN_PASS2

  # Generated here, on this machine. SQL Server's policy wants length plus three of four
  # character classes; the fixed suffix guarantees them after the awkward characters are
  # stripped out.
  SA_PASSWORD="$(openssl rand -base64 30 | tr -d '/+=\n' | head -c 28)Aa1"
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"

  umask 077
  {
    echo "# Written by scripts/server-setup.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')."
    echo "# Every value here is a secret except PUBLIC_ORIGIN, SITE_ADDRESS and CADDY_TLS."
    echo "# Git-ignored on purpose. What each key means is documented in .env.example."
    echo "# Back it up somewhere safe: JWT_SECRET and SA_PASSWORD cannot be recovered."
    echo
    printf 'PUBLIC_ORIGIN=http://%s\n' "$IP"
    printf 'SA_PASSWORD=%s\n'          "$SA_PASSWORD"
    printf 'JWT_SECRET=%s\n'           "$JWT_SECRET"
    printf 'MAIN_ADMIN_EMAIL=%s\n'     "$ADMIN_EMAIL"
    printf 'MAIN_ADMIN_PASSWORD=%s\n'  "$ADMIN_PASS"
    printf 'MAIN_ADMIN_NAME=%s\n'      "$ADMIN_NAME"
    echo
    echo "# Demo data is never seeded automatically. Property types, features and areas are"
    echo "# seeded once on first start because the system needs them."
    echo "SEED_DATA="
    echo
    echo "# Maps are free (MapLibre) and need no token."
    echo "VITE_MAPBOX_TOKEN="
    echo
    echo "# Filled in by step 5 below — the application's own database login, instead of sa."
    echo "DB_USER="
    echo "DB_PASSWORD="
    echo
    echo "# HTTPS. Left unset = plain HTTP straight from nginx on port 80."
    echo "# scripts/enable-https.sh fills these in once a domain points here."
    echo "# COMPOSE_PROFILES=tls"
    echo "# FRONTEND_BIND=127.0.0.1:8080"
    echo "# SITE_ADDRESS="
    echo "# CADDY_TLS="
    echo "# CADDY_HSTS=max-age=0"
  } > .env
  chmod 600 .env
  unset ADMIN_PASS SA_PASSWORD JWT_SECRET
  echo
  echo "    written, readable by root only."
fi

# -----------------------------------------------------------------------------------------
# 4. Build and start
# -----------------------------------------------------------------------------------------
step "Building and starting (first time takes a few minutes)"
docker compose up -d --build || die "the build failed. The reason is above; 'docker compose logs' has more."

printf '    waiting for the API'
UP=0
for _ in $(seq 1 60); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost/api/properties 2>/dev/null || true)"
  if [ "$CODE" = "200" ]; then UP=1; break; fi
  printf '.'; sleep 5
done
echo
[ "$UP" = "1" ] || die "the API did not come up within five minutes. Look at: docker compose logs backend --tail 80"
echo "    the API is answering."

# -----------------------------------------------------------------------------------------
# 5. A database login of its own, instead of sa
# -----------------------------------------------------------------------------------------
step "Giving the application its own database login"
CURRENT_DB_USER="$(grep -E '^DB_USER=' .env | cut -d= -f2- || true)"
if [ -n "$CURRENT_DB_USER" ]; then
  echo "    already set up as '${CURRENT_DB_USER}' — skipping."
else
  OUT="$(./scripts/create-db-user.sh 2>&1)" || { printf '%s\n' "$OUT"; die "could not create the database login."; }
  NEW_USER="$(printf '%s' "$OUT" | sed -n 's/^ *DB_USER=\(.*\)$/\1/p' | tail -1)"
  NEW_PASS="$(printf '%s' "$OUT" | sed -n 's/^ *DB_PASSWORD=\(.*\)$/\1/p' | tail -1)"
  unset OUT
  [ -n "$NEW_USER" ] && [ -n "$NEW_PASS" ] || die "create-db-user.sh did not report a login to use. Run it on its own and paste the two lines into .env yourself."

  # Replaced with printf, not sed: the password is arbitrary text and sed would treat
  # characters in it as part of the replacement expression.
  TMP="$(mktemp)"; chmod 600 "$TMP"
  while IFS= read -r line; do
    case "$line" in
      DB_USER=*)     printf 'DB_USER=%s\n' "$NEW_USER" ;;
      DB_PASSWORD=*) printf 'DB_PASSWORD=%s\n' "$NEW_PASS" ;;
      *)             printf '%s\n' "$line" ;;
    esac
  done < .env > "$TMP"
  mv "$TMP" .env; chmod 600 .env
  unset NEW_PASS

  grep -q "^DB_USER=${NEW_USER}$" .env || die "could not write the login into .env."
  echo "    .env updated — restarting the API so it stops using sa"
  docker compose up -d --force-recreate backend >/dev/null || die "could not restart the API."

  printf '    waiting for it to come back'
  BACK=0
  for _ in $(seq 1 36); do
    CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost/api/properties 2>/dev/null || true)"
    if [ "$CODE" = "200" ]; then BACK=1; break; fi
    printf '.'; sleep 5
  done
  echo
  [ "$BACK" = "1" ] || die "the API did not come back after the restart — most likely the new database login. Check: docker compose logs backend --tail 60"
  echo "    done: the application now connects as '${NEW_USER}', not sa."
fi

# -----------------------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------------------
ORIGIN="$(grep -E '^PUBLIC_ORIGIN=' .env | cut -d= -f2-)"
cat <<DONE

$(bold "The site is up.")

    Site           ${ORIGIN}
    Control panel  ${ORIGIN}/admin/login     (the email and password you just chose)
    Project        ${TARGET_DIR}

$(bold "Next: HTTPS")

    It needs a domain pointing at this server, which Let's Encrypt can then verify.

      1. At your domain registrar, add an A record for the hostname you want, pointing
         at this server's IP. Add one for "www" too if you want both to work.
      2. Wait for it to take effect — usually minutes, up to a few hours.
      3. Then, here:

             cd ${TARGET_DIR}
             sudo ./scripts/enable-https.sh www.yourdomain.com you@yourdomain.com

    That script checks DNS before it changes anything, and the certificate is free and
    renews itself from then on.

$(bold "Worth doing")

    Back up .env off this server. JWT_SECRET and SA_PASSWORD are not recoverable.
    Database backups:  ./scripts/backup-db.sh
    Check everything:  ./scripts/verify.sh

DONE
