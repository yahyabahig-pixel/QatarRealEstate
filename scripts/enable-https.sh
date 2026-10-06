#!/usr/bin/env bash
# =========================================================================================
# Put the site on HTTPS with a free, self-renewing Let's Encrypt certificate.
#
#     sudo ./scripts/enable-https.sh www.yourdomain.com you@yourdomain.com
#
# Before it changes anything it checks that the hostname actually resolves to THIS server.
# That check is the point of the script: Let's Encrypt allows only about five failed
# validations per hostname per hour, so a premature attempt costs you an hour of waiting,
# not just a retry. Nothing is touched until DNS is right.
#
# What it then does:
#   1. backs up .env
#   2. sets COMPOSE_PROFILES=tls, FRONTEND_BIND=127.0.0.1:8080, SITE_ADDRESS, CADDY_TLS
#      and PUBLIC_ORIGIN — docker-compose.yml itself is never edited
#   3. rebuilds the frontend image (NOT optional: Vite bakes PUBLIC_ORIGIN into the
#      JavaScript bundle at build time, so a restart alone would leave the browser calling
#      the old http:// address and the page would break on mixed content)
#   4. starts Caddy, waits for the certificate, and verifies the real TLS handshake
#   5. if the certificate does not arrive, puts everything back on plain HTTP — the site
#      stays up either way
#
# Afterwards the certificate renews itself. There is nothing to put in cron.
#
# To go back to plain HTTP by hand at any time: restore the .env backup this script makes,
# then `docker compose build frontend && docker compose up -d --remove-orphans`.
# =========================================================================================
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DOMAIN="${1:-}"
EMAIL="${2:-}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mfailed: %s\033[0m\n' "$*" >&2; exit 1; }

usage() {
  cat >&2 <<USAGE
usage: sudo ./scripts/enable-https.sh <hostname> <email>

  hostname   the name visitors will type, e.g. www.almadenah.qa
             Use the exact host you created the DNS record for. "www.x.com" and "x.com"
             are two different names and need two records.
  email      Let's Encrypt uses it only to warn you if a renewal ever breaks.

USAGE
  exit 2
}

[ -n "$DOMAIN" ] && [ -n "$EMAIL" ] || usage
case "$DOMAIN" in
  http://*|https://*) die "give the hostname on its own, with no http:// in front: ${DOMAIN#*://}" ;;
  *[!a-zA-Z0-9.-]*)   die "'${DOMAIN}' is not a hostname." ;;
  *.*)                : ;;
  *)                  die "'${DOMAIN}' is not a full hostname." ;;
esac
case "$EMAIL" in *@*.*) : ;; *) die "'${EMAIL}' is not an email address." ;; esac

[ "$(id -u)" = "0" ] || die "run this with sudo — it writes .env and binds ports 80 and 443."
[ -f .env ] || die "no .env here. Run this from the deployment directory (where docker-compose.yml is)."
command -v docker >/dev/null || die "docker is not installed."

# -----------------------------------------------------------------------------------------
# 1. Does that hostname point here?
# -----------------------------------------------------------------------------------------
step "Checking DNS for ${DOMAIN}"

MY_IP="${PUBLIC_IP:-$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)}"
[ -n "$MY_IP" ] || die "could not work out this server's public IP. Pass it yourself: PUBLIC_IP=1.2.3.4 sudo ./scripts/enable-https.sh ${DOMAIN} ${EMAIL}"
echo "    this server : ${MY_IP}"

resolve() {
  if command -v getent >/dev/null; then getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u; fi
}
RESOLVED="$(resolve "$DOMAIN")"

if [ -z "$RESOLVED" ]; then
  die "${DOMAIN} does not resolve to anything yet.

    Add an A record at your registrar:
        type   A
        name   ${DOMAIN%%.*}        (or @ for the bare domain)
        value  ${MY_IP}
    then wait for it to take effect and run this again.

    Check it from anywhere with:  dig +short ${DOMAIN}"
fi

echo "    ${DOMAIN} -> $(printf '%s' "$RESOLVED" | tr '\n' ' ')"

if ! printf '%s\n' "$RESOLVED" | grep -qx "$MY_IP"; then
  die "${DOMAIN} points somewhere else, not at this server.

    it resolves to : $(printf '%s' "$RESOLVED" | tr '\n' ' ')
    this server is : ${MY_IP}

    Fix the A record and run this again. Nothing has been changed.

    If you put the domain behind Cloudflare's proxy (the orange cloud), that is what
    you are seeing: turn the proxy off (grey cloud) while the certificate is issued,
    or let Cloudflare handle TLS instead of this script."
fi
echo "    correct — it points at this server."

# Port 80 has to be free for Let's Encrypt's HTTP-01 check, and Caddy is about to claim it
# from nginx. Anything ELSE sitting on 80 or 443 (a stray apache, a host nginx) would make
# Caddy fail to start, so catch it now rather than half-way through.
step "Checking ports 80 and 443"
if command -v ss >/dev/null; then
  for P in 80 443; do
    HOLDER="$(ss -ltnpH "sport = :$P" 2>/dev/null | grep -v 'docker\|qre-' || true)"
    if [ -n "$HOLDER" ]; then
      warn "something other than this project is listening on port ${P}:"
      printf '%s\n' "$HOLDER" | sed 's/^/        /'
      die "stop it first, or Caddy will not be able to start."
    fi
  done
fi
echo "    free (apart from this project's own containers)."

# -----------------------------------------------------------------------------------------
# 2. .env
# -----------------------------------------------------------------------------------------
step "Updating .env"
BACKUP=".env.before-https.$(date -u '+%Y%m%d-%H%M%S')"
cp -p .env "$BACKUP"; chmod 600 "$BACKUP"
echo "    backup: ${BACKUP}"

# Written with printf and a read loop rather than sed: these values are arbitrary text and
# sed would read characters in them as part of its replacement expression.
set_env() {
  local key="$1" val="$2" tmp found=0
  tmp="$(mktemp)"; chmod 600 "$tmp"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "${key}="*|"# ${key}="*|"#${key}="*)
        if [ "$found" = 0 ]; then printf '%s=%s\n' "$key" "$val"; found=1; fi ;;
      *) printf '%s\n' "$line" ;;
    esac
  done < .env > "$tmp"
  [ "$found" = 1 ] || printf '%s=%s\n' "$key" "$val" >> "$tmp"
  mv "$tmp" .env; chmod 600 .env
  grep -qxF "${key}=${val}" .env || die "could not write ${key} into .env."
}

set_env COMPOSE_PROFILES tls
set_env FRONTEND_BIND    127.0.0.1:8080
set_env SITE_ADDRESS     "$DOMAIN"
set_env CADDY_TLS        "$EMAIL"
set_env PUBLIC_ORIGIN    "https://${DOMAIN}"
# Deliberately left at max-age=0 for now. HSTS tells browsers "never speak plain HTTP to
# this host again", and they obey it even if the certificate later breaks — which would
# make the site unreachable with no way to tell visitors. Raise it once HTTPS has been
# serving happily for a day or two; the Caddyfile explains how.
set_env CADDY_HSTS       "max-age=0"
echo "    PUBLIC_ORIGIN = https://${DOMAIN}"

restore() {
  warn "putting everything back the way it was"
  cp -p "$BACKUP" .env
  docker compose build frontend >/dev/null 2>&1 || true
  docker compose up -d --remove-orphans >/dev/null 2>&1 || true
  echo "    back on plain HTTP. The site is up; nothing was lost."
}

# -----------------------------------------------------------------------------------------
# 3. Rebuild — mandatory, see the header
# -----------------------------------------------------------------------------------------
step "Rebuilding the frontend with the new address"
docker compose build frontend || { restore; die "the rebuild failed."; }

step "Starting Caddy and asking Let's Encrypt for the certificate"
docker compose up -d --remove-orphans || { restore; die "could not start the containers."; }

# -----------------------------------------------------------------------------------------
# 4. Wait for a real certificate, and prove it
# -----------------------------------------------------------------------------------------
# Verified with --resolve against 127.0.0.1 on purpose: it makes curl do a full TLS
# handshake for this hostname against our own Caddy, without depending on the server being
# able to reach its own public IP — many hosts cannot (no NAT hairpin), and that would look
# like a certificate failure when the certificate is fine.
step "Waiting for the certificate"
printf '    '
GOT=0
for _ in $(seq 1 40); do
  if curl -fsS --max-time 8 --resolve "${DOMAIN}:443:127.0.0.1" \
       -o /dev/null "https://${DOMAIN}/" 2>/dev/null; then GOT=1; break; fi
  printf '.'; sleep 6
done
echo

if [ "$GOT" != "1" ]; then
  echo
  warn "the certificate did not arrive within four minutes. Caddy said:"
  docker compose logs caddy --tail 40 2>/dev/null | sed 's/^/        /'
  echo
  restore
  die "HTTPS is not on, and the site is back on http://${MY_IP} so it is not down.

    The usual causes, in order:
      - port 80 blocked by the provider's firewall. Let's Encrypt must reach this server
        on port 80 from the outside; it is not enough for 443 to be open.
      - DNS only just changed and Let's Encrypt still sees the old answer.
      - the hostname is proxied through Cloudflare (orange cloud).
      - the hourly rate limit was already spent on earlier attempts — about five failures
        per hostname per hour. If so, waiting an hour is the fix.

    The Caddy log above names the real reason. Fix it and run this again."
fi

# An expired or self-signed certificate would also have passed the check above if curl had
# been told to ignore errors — it was not, so reaching here means the chain verified. Read
# the issuer back anyway, because "verified" against Caddy's own local CA (the `internal`
# mode, which trusts nothing publicly) is a real possibility worth ruling out.
ISSUER="$(printf '' | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null \
          | openssl x509 -noout -issuer 2>/dev/null || true)"
case "$ISSUER" in
  *"Let's Encrypt"*|*"ISRG"*|*"R3"*|*"E1"*|*"E5"*|*"E6"*|*"R10"*|*"R11"*)
    echo "    issued by Let's Encrypt — a real, publicly trusted certificate." ;;
  "")
    warn "the handshake worked but the issuer could not be read. Check it in a browser." ;;
  *)
    warn "the certificate verified, but it was issued by: ${ISSUER#issuer=}"
    warn "if that is not Let's Encrypt, visitors may still see a warning. Check in a browser." ;;
esac

EXPIRES="$(printf '' | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null \
           | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)"

# The redirect from plain HTTP is Caddy's own, and it is what makes an old http:// link or
# a typed bare hostname still land on the secure site.
REDIR="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 \
         --resolve "${DOMAIN}:80:127.0.0.1" "http://${DOMAIN}/" 2>/dev/null || true)"
case "$REDIR" in
  30*) echo "    http:// redirects to https:// (${REDIR})." ;;
  *)   warn "http:// did not redirect (got ${REDIR:-no answer}). HTTPS works; old links may not forward." ;;
esac

# nginx must no longer be reachable from outside, or visitors could bypass TLS entirely.
if curl -s -o /dev/null --max-time 5 "http://${MY_IP}/" 2>/dev/null; then
  warn "the site still answers plain HTTP on ${MY_IP} directly. Check FRONTEND_BIND in .env."
else
  echo "    plain HTTP on the bare IP is closed — everything goes through Caddy now."
fi

cat <<DONE

$(bold "HTTPS is on.")

    Site           https://${DOMAIN}
    Control panel  https://${DOMAIN}/admin/login
    Certificate    Let's Encrypt${EXPIRES:+, valid until ${EXPIRES}}
    Renewal        automatic, by Caddy. Nothing to schedule.
    .env backup    ${BACKUP}

$(bold "Worth knowing")

    - Open https://${DOMAIN} in a browser once and check the padlock.
    - WhatsApp link previews and Google indexing work off PUBLIC_ORIGIN, which now points
      at the domain, so they start working on their own.
    - If you also want the bare domain (without www) to work, add an A record for it too
      and re-run this with that name.
    - HSTS is deliberately off for now. Once the site has been fine on HTTPS for a day or
      two, set CADDY_HSTS="max-age=31536000; includeSubDomains" in .env and run
      'docker compose up -d caddy'. Read the warning in docker/caddy/Caddyfile first.

DONE
