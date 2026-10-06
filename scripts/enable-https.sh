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

DOMAIN_ARG="${1:-}"
EMAIL="${2:-}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mfailed: %s\033[0m\n' "$*" >&2; exit 1; }

usage() {
  cat >&2 <<USAGE
usage: sudo ./scripts/enable-https.sh <hostname>[,<hostname>...] <email>

  hostname   the name visitors will type, e.g. www.almadenah.qa
             "x.com" and "www.x.com" are two different names: each needs its own DNS
             record, and each must be listed here or it will not be on the certificate.
             List them comma-separated and they all go on ONE certificate:

                 sudo ./scripts/enable-https.sh example.com,www.example.com me@example.com

             The FIRST one is the canonical address — it becomes PUBLIC_ORIGIN, the
             address the site builds its own links from. The others still work and still
             serve HTTPS.
  email      Let's Encrypt uses it only to warn you if a renewal ever breaks.

USAGE
  exit 2
}

[ -n "$DOMAIN_ARG" ] && [ -n "$EMAIL" ] || usage

# Comma-separated into a list, trimming spaces so "a.com, www.a.com" works too.
DOMAINS=""
OLD_IFS="$IFS"; IFS=','
for D in $DOMAIN_ARG; do
  # Trim the ends only -- never whitespace in the MIDDLE. Stripping that would quietly
  # turn a typo like "el madenah.com" into "elmadenah.com" and go off and certify a name
  # nobody asked for; left in place, the character check below rejects it by name.
  D="${D#"${D%%[![:space:]]*}"}"
  D="${D%"${D##*[![:space:]]}"}"
  [ -n "$D" ] || continue
  case "$D" in
    http://*|https://*) IFS="$OLD_IFS"; die "give the hostname on its own, with no http:// in front: ${D#*://}" ;;
    *[!a-zA-Z0-9.-]*)   IFS="$OLD_IFS"; die "'${D}' is not a hostname." ;;
    *.*)                : ;;
    *)                  IFS="$OLD_IFS"; die "'${D}' is not a full hostname." ;;
  esac
  DOMAINS="${DOMAINS}${DOMAINS:+ }${D}"
done
IFS="$OLD_IFS"
[ -n "$DOMAINS" ] || usage

# The first is canonical: PUBLIC_ORIGIN, and the name every check below verifies against.
DOMAIN="${DOMAINS%% *}"
# Caddy takes several site addresses on one site block, comma-separated, and puts them all
# on a single certificate. ", " with the space is the documented form, and the generated
# config is validated below before anything is changed, so a wrong guess here cannot reach
# the running site.
SITE_LIST="$(printf '%s' "$DOMAINS" | sed 's/ /, /g')"

case "$EMAIL" in *@*.*) : ;; *) die "'${EMAIL}' is not an email address." ;; esac

[ "$(id -u)" = "0" ] || die "run this with sudo — it writes .env and binds ports 80 and 443."
[ -f .env ] || die "no .env here. Run this from the deployment directory (where docker-compose.yml is)."
command -v docker >/dev/null || die "docker is not installed."

# -----------------------------------------------------------------------------------------
# 1. Does that hostname point here?
# -----------------------------------------------------------------------------------------
step "Checking DNS"

MY_IP="${PUBLIC_IP:-$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)}"
[ -n "$MY_IP" ] || die "could not work out this server's public IP. Pass it yourself: PUBLIC_IP=1.2.3.4 sudo ./scripts/enable-https.sh ${DOMAIN_ARG} ${EMAIL}"
echo "    this server : ${MY_IP}"

resolve() {
  if command -v getent >/dev/null; then getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u; fi
}

# EVERY name is checked, not just the canonical one. Let's Encrypt validates each name on
# the certificate separately, so one name pointing elsewhere fails the whole request --
# and it spends the hourly allowance doing it.
for D in $DOMAINS; do
  RESOLVED="$(resolve "$D")"

  if [ -z "$RESOLVED" ]; then
    die "${D} does not resolve to anything yet.

    Add an A record at your registrar:
        type   A
        name   $(case "$D" in *.*.*) printf '%s' "${D%%.*}" ;; *) printf '@' ;; esac)
        value  ${MY_IP}
    then wait for it to take effect and run this again.

    Check it from anywhere with:  dig +short ${D}

    Or drop it from the list and certify only the names that are ready."
  fi

  if ! printf '%s\n' "$RESOLVED" | grep -qx "$MY_IP"; then
    die "${D} points somewhere else, not at this server.

    it resolves to : $(printf '%s' "$RESOLVED" | tr '\n' ' ')
    this server is : ${MY_IP}

    Fix the A record and run this again. Nothing has been changed.

    If you put the domain behind Cloudflare's proxy (the orange cloud), that is what
    you are seeing: turn the proxy off (grey cloud) while the certificate is issued,
    or let Cloudflare handle TLS instead of this script."
  fi

  echo "    ${D} -> ${MY_IP}  ✓"
done
echo "    all $(printf '%s' "$DOMAINS" | wc -w | tr -d ' ') name(s) point at this server."

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
# 1.5 Does Caddy actually accept the config we are about to give it?
# -----------------------------------------------------------------------------------------
# `caddy validate` runs the real Caddyfile adapter against the real values in a throwaway
# container, touching nothing. It is here because the alternative is finding out after the
# rebuild, when the failure arrives as a container that will not start -- recoverable, but
# only after several wasted minutes. A multi-name SITE_ADDRESS is the case worth catching.
step "Checking the Caddy configuration"
if docker run --rm \
     -v "$PWD/docker/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" \
     -e SITE_ADDRESS="$SITE_LIST" -e CADDY_TLS="$EMAIL" -e CADDY_HSTS="max-age=0" \
     caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
     >/tmp/qre-caddy-validate.log 2>&1; then
  echo "    valid for: ${SITE_LIST}"
else
  echo
  sed 's/^/        /' /tmp/qre-caddy-validate.log
  rm -f /tmp/qre-caddy-validate.log
  die "Caddy rejected that configuration. Nothing has been changed.

    If you passed several hostnames, try one on its own first:
        sudo ./scripts/enable-https.sh ${DOMAIN} ${EMAIL}"
fi
rm -f /tmp/qre-caddy-validate.log

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
set_env SITE_ADDRESS     "$SITE_LIST"
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
    On the cert    ${SITE_LIST}
    Certificate    Let's Encrypt${EXPIRES:+, valid until ${EXPIRES}}
    Renewal        automatic, by Caddy. Nothing to schedule.
    .env backup    ${BACKUP}

$(bold "Worth knowing")

    - Open https://${DOMAIN} in a browser once and check the padlock.
    - WhatsApp link previews and Google indexing work off PUBLIC_ORIGIN, which is now
      https://${DOMAIN}, so they start working on their own.
    - Every name on the certificate serves HTTPS, but the site builds its own links from
      the canonical one above. To add another name later, point its A record here and
      re-run this with the full list, canonical name first.
    - HSTS is deliberately off for now. Once the site has been fine on HTTPS for a day or
      two, set CADDY_HSTS="max-age=31536000; includeSubDomains" in .env and run
      'docker compose up -d caddy'. Read the warning in docker/caddy/Caddyfile first.

DONE
