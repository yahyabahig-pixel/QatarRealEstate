# Deployment

> The system deploys as three containers (four with TLS) from a single `docker compose up`. This document covers the images, the configuration surface, the TLS decision, and the operations that are easy to get wrong.

- [Topology](#topology)
- [Images](#images)
- [Configuration](#configuration)
- [First deploy](#first-deploy)
- [TLS modes](#tls-modes)
- [Routine operations](#routine-operations)
- [Troubleshooting](#troubleshooting)
- [Production checklist](#production-checklist)

---

## Topology

| Service | Image | Publishes | Purpose |
|---|---|---|---|
| `sqlserver` | `mcr.microsoft.com/mssql/server:2025-latest` | **nothing** | Database. Express edition, buffer pool capped at 2 GB |
| `backend` | built from `Dockerfile.backend` | **nothing** | ASP.NET Core API on `:8080`, non-root |
| `frontend` | built from `Dockerfile.frontend` | `80` *(when Caddy is off)* | nginx serving the SPA and proxying `/api` |
| `caddy` | `caddy:2-alpine` *(optional)* | `80`, `443`, `443/udp` | TLS edge with automatic certificates |

Named volumes: `mssql-data` (the database), `dpkeys` (the DataProtection key ring), `caddy_data` + `caddy_config` (certificates and ACME account).

**Exactly one container is ever published to the internet.** See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md#the-exposure-rule) for why the database having no `ports:` section is a stronger control than a host firewall rule.

---

## Images

### Backend — two stages

```
mcr.microsoft.com/dotnet/sdk:10.0      → restore (project files first, for layer caching), publish Release
mcr.microsoft.com/dotnet/aspnet:10.0   → runtime only, ~377 MB
```

Notable details:

- **`.csproj` files are copied before the source**, so a code change does not invalidate the NuGet restore layer. On this solution that turns a 60-second rebuild into a 20-second one.
- `dotnet publish --no-restore` — deliberate, so the build fails loudly if a package reference was missed rather than silently restoring again.
- `ASPNETCORE_HTTP_PORTS=8080` — a port above 1024, which is what allows the container to run as a non-root user.
- The DataProtection key directory is created and `chown`ed **before** `USER $APP_UID`. It has to be: after the switch the process is an unprivileged numeric UID that cannot create anything under a root-owned directory, and an empty named volume inherits the ownership of the image directory it covers.

### Frontend — two stages

```
node:22-slim        → npm ci (falling back to npm install), npm run build
nginx:1.27-alpine   → static files + our conf, ~74 MB
```

- `node:22-slim` rather than Alpine because Tailwind v4 pulls in native binaries (`lightningcss`) whose musl variants occasionally fail to install.
- `npm ci || npm install` — npm generates lockfiles that are platform-incomplete: on macOS it prunes dependencies of optional packages that only matter on Linux, and `npm ci` then refuses to run. The fallback resolves the gap; versions stay pinned for everything the lockfile does list.
- **`VITE_API_URL` and `VITE_SITE_URL` arrive as build args and are inlined into the bundle.** This is the single most important operational fact about this image: changing `PUBLIC_ORIGIN` requires `docker compose build frontend`, not just a restart.

---

## Configuration

Everything comes from a `.env` file sitting next to `docker-compose.yml` on the server. It is git-ignored and never leaves the machine. `.env.example` documents every variable.

| Variable | Required | Notes |
|---|---|---|
| `PUBLIC_ORIGIN` | ✅ | The URL browsers use. **Build-time** — inlined into the JS bundle. Also becomes the CORS allow-list entry |
| `SA_PASSWORD` | ✅ | SQL Server `sa`. 8+ chars, upper + lower + digit |
| `JWT_SECRET` | ✅ | **32 characters minimum** or the app throws at startup. `openssl rand -base64 48` |
| `MAIN_ADMIN_EMAIL` | ✅ | Blank ⇒ `AuthSeeder` throws ⇒ backend crash-loop. Deliberate |
| `MAIN_ADMIN_PASSWORD` | ✅ | Must satisfy the Identity policy |
| `MAIN_ADMIN_NAME` | — | Defaults to `Main Admin` |
| ~~`SEED_DATA`~~ | — | **Gone.** Delete the line from `.env`. The bootstrap now runs once, always, and records itself; the demo listings moved behind `docker compose run --rm backend seed --demo` |
| `DB_USER` / `DB_PASSWORD` | recommended | The login the app uses. Blank falls back to `sa`; `./scripts/create-db-user.sh` creates a proper one |
| ~~`VITE_MAPBOX_TOKEN`~~ | — | Unused. Maps run on MapLibre GL + OpenFreeMap: no account, no token. Still passed as a build arg so an existing `.env` does not break; leave it blank |
| `CADDY_HSTS` | — | `max-age=0` (off, the default) until a real certificate is being served |
| `SITE_ADDRESS` | — | Caddy. `:443` or a hostname. Defaults to `:443` |
| `CADDY_TLS` | — | `internal` or an email address. Defaults to `internal` |

### How a variable reaches the app

```
.env  →  docker-compose.yml environment:  →  ASP.NET Core configuration
         Startup__SeedData                    Startup:SeedData
         ConnectionStrings__RealEstateDb      ConnectionStrings:RealEstateDb
```

.NET turns a **double underscore** into a configuration-section separator, which is how environment variables override `appsettings.json` without any code.

Hardcoded in `docker-compose.yml` rather than exposed as variables — deliberately:

| Setting | Value | Why |
|---|---|---|
| `Startup__ApplyMigrations` | `"true"` | The schema must exist before the first request; there is no hand to run `dotnet ef` in a container |
| `Startup__UseHttpsRedirection` | `"false"` | `Program.cs` never calls `UseForwardedHeaders()`, so Kestrel would see the plaintext edge→nginx hop and redirect forever. Caddy already redirects |
| `DataProtection__KeyRingPath` | `/home/app/.aspnet/DataProtection-Keys` | Backed by the `dpkeys` volume |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Which also switches OpenAPI off and hides exception details |

---

## First deploy

```bash
# On the server
git clone https://github.com/yahyabahig-pixel/QatarRealEstate.git /opt/qre
cd /opt/qre

cp .env.example .env
umask 077 && nano .env          # fill in every required variable
chmod 600 .env

docker compose up -d --build
docker compose logs -f backend
```

Expected sequence in the logs:

```
Applying 1 migration(s) to schema 'auth': 20260728043240_InitialAuth
Schema 'auth' migrated successfully.
Applying 7 migration(s) to schema 'realestate': …
Schema 'realestate' migrated successfully.
… seeding …
Now listening on: http://[::]:8080
Application started.
```

A few `Database not reachable yet for schema 'auth' (attempt 1/20)` lines before that are **normal** — SQL Server takes 20–40 seconds to accept connections on a cold start and the migration code retries for up to 100 seconds.

Then:

```bash
docker compose ps                  # three or four containers, one publishing ports
curl -sI http://<host>             # expect HTTP/1.1 200
```

Log in at `http://<host>/admin/login` with `MAIN_ADMIN_EMAIL` / `MAIN_ADMIN_PASSWORD`. The site starts **empty of listings** — that is deliberate. Demo data is no longer seeded on startup. The bootstrap (roles, the Main Admin, the default positions and the reference catalogues) runs automatically and is recorded in a `SeedHistory` table, so each batch runs exactly once and whatever you delete stays deleted. The demo listings are an explicit command that refuses to run in Production: `docker compose run --rm backend seed --demo`.

There is nothing to turn off afterwards. The old instruction here was to set `SEED_DATA=false` once the first deploy was done; forgetting it is what put deleted demo listings back on every restart.

---

## TLS modes

Let's Encrypt **cannot issue a certificate for a bare IP address**. A hostname is the only route to a trusted certificate. That constraint drives the whole decision.

### Mode A — no domain, plain HTTP (recommended while there is no hostname)

Comment out the `caddy:` service and give `frontend` back `ports: ["80:80"]`. No warning, no mixed content, everything works. `docker-compose.yml` carries a numbered recipe for switching back.

### Mode B — no domain, self-signed HTTPS

```env
SITE_ADDRESS=:443
CADDY_TLS=internal
```

Caddy issues from its own local CA. Two consequences, both visible to every visitor:

1. A full-page "certificate authority invalid" warning.
2. **Mixed content breaks the app.** The bundle was built with `VITE_API_URL=http://<ip>`, so once the redirect lands the browser on `https://`, every API call is blocked. The site renders headings with no data — which looks exactly like the backend being down.

Useful for testing the TLS path. Not for launch.

### Mode C — a real domain

```env
SITE_ADDRESS=qre.example.com
CADDY_TLS=you@example.com
PUBLIC_ORIGIN=https://qre.example.com
```

Then, and this step is the one people forget:

```bash
docker compose build frontend && docker compose up -d
```

`PUBLIC_ORIGIN` is baked into the JS bundle at build time. A restart does not pick it up.

**Rehearse before going live.** Let's Encrypt allows roughly five failed validations per hostname per hour. Uncomment the staging `acme_ca` line in `docker/caddy/Caddyfile`, confirm issuance works end to end, then comment it back out and restart Caddy for the real certificate.

Firewall notes: ports 80 and 443 must both be open — 80 is required for HTTP-01 validation and for the redirect. On Contabo and similar hosts there may be a panel-level firewall *in addition to* UFW. Note also that Docker writes its own iptables rules, so a published port is reachable even if UFW says otherwise.

---

## Routine operations

```bash
# Deploy a backend change
cd /opt/qre && git pull
docker compose build backend && docker compose up -d

# Deploy a frontend change — or any PUBLIC_ORIGIN change
docker compose build frontend && docker compose up -d

# Full redeploy
docker compose down && git pull && docker compose build && docker compose up -d

# Logs
docker compose logs -f backend
docker compose logs --tail=100 frontend

# Verify a change before deploying it — builds, tests, and proves a delete survives a
# restart, all against a throwaway database. Your data is not touched.
./scripts/verify.sh

# Insert the demo listings (DEVELOPMENT ONLY — refused when ASPNETCORE_ENVIRONMENT
# is Production). They are no longer seeded automatically; that is what used to put
# deleted demo data back on every restart.
docker compose run --rm backend seed --demo

# Database shell
docker compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT COUNT(*) FROM realestate.Properties"
```

### Backups

`mssql-data` is the only copy of every listing, every photo (photos are `varbinary` columns,
not files on disk) and every lead. A Docker volume is not a backup: it does not survive
`docker compose down -v`, a mistyped `docker volume rm`, or the disk it sits on.

```bash
./scripts/backup-db.sh
```

Runs `BACKUP DATABASE` inside the container — a real, consistent SQL Server backup, not a
file copy of a running database — verifies it with `RESTORE VERIFYONLY`, copies the `.bak`
out to `./backups`, and deletes backups older than `RETENTION_DAYS` (14 by default).

Put it on a cron job:

```cron
30 2 * * *  cd /opt/qre && ./scripts/backup-db.sh >> /var/log/qre-backup.log 2>&1
```

Two things the script cannot do for you:

**Copy `./backups` off this machine.** A backup on the same disk as the database does not
survive that disk. `rsync`, `rclone`, an object store — anything that is somewhere else.

**Rehearse the restore.** An untested backup is a guess, not a backup:

```bash
./scripts/restore-db.sh backups/QatarRealEstate-20260930-023000.bak
```

That restores into a scratch database (`QatarRealEstate_RestoreTest`) and prints the row
counts that came back. The live database is not touched. Do it once now, and again after
any meaningful schema change.

The real thing, for the day it is needed:

```bash
docker compose stop backend
./scripts/restore-db.sh backups/<file>.bak --into-live    # asks you to type the DB name
docker compose start backend
```

### Volumes

| Volume | On-disk name | Losing it means |
|---|---|---|
| `mssql-data` | `qre_mssql-data` | Total data loss |
| `dpkeys` | `qre_dpkeys` | Outstanding password-reset links stop validating. Acceptable |
| `caddy_data` | `qre_caddy_data` | Certificates re-requested — risks the 50-per-domain-per-week rate limit |

Compose prefixes volume names with the project name; use the prefixed form with `docker volume inspect`.

`docker compose down` keeps volumes. **`docker compose down -v` destroys them.**

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `port is already allocated` on `frontend` | An orphaned `caddy` container still holds `:80` | `docker compose up -d --remove-orphans` |
| Backend crash-loops immediately | Blank `MAIN_ADMIN_EMAIL`/`PASSWORD`, or `JWT_SECRET` under 32 chars | Read the log — the message names the variable |
| `Invalid column name '…'` at startup | Model drift — a migration was not generated | See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#always-check-for-model-drift) |
| Site loads, no data | `PUBLIC_ORIGIN` mismatch or mixed content | Check the Network tab. Fix `.env` **and rebuild the frontend image** |
| `502 Bad Gateway` on `/api` | Backend down or still migrating | `docker compose logs backend` |
| `host not found in upstream "backend"` | Backend container absent, or the service was renamed | The nginx config resolves at request time; check the container is up |
| Caddy exits immediately | `docker/caddy/Caddyfile` is missing, so Docker created a **directory** at the bind-mount path | Restore the file, remove the stray directory |
| Certificate warning on a bare IP | Expected in mode B | Get a hostname, or use mode A |
| `COPY docker/nginx/default.conf … not found` | The `docker/` tree is missing from the build context | Restore it; check `git status` and `.dockerignore` |
| Empty site after a fresh deploy | Expected: demo content is not seeded automatically any more | `docker compose run --rm backend seed --demo` on a DEVELOPMENT database, or add real listings through the admin panel |
| Deleted listings come back after a restart | A `SeedHistory` row is missing, or someone ran `seed --demo --force` | `SELECT * FROM realestate.SeedHistory` — a batch with a row there never runs again |

---

## Production checklist

- [ ] `.env` is `chmod 600`, owned by the deploy user, and not in git
- [ ] `JWT_SECRET` is 48+ random characters and **not** any value from `appsettings*.json`
- [ ] `SA_PASSWORD` rotated away from every value in the repository
- [ ] `MAIN_ADMIN_PASSWORD` is strong and stored in a password manager
- [ ] `DB_USER` / `DB_PASSWORD` set — the app is not connecting as `sa` (`./scripts/create-db-user.sh`)
- [ ] `./scripts/backup-db.sh` on a cron job, and `./backups` copied to another machine
- [ ] A restore rehearsed at least once (`./scripts/restore-db.sh <file>`)
- [ ] `./scripts/verify.sh` passes
- [ ] `PUBLIC_ORIGIN` matches the scheme and host users actually type
- [ ] The frontend image was rebuilt after the last `PUBLIC_ORIGIN` change
- [ ] A hostname with a real certificate, or a conscious decision to run plain HTTP
- [ ] Ports 80 and 443 open at both the host and the provider firewall; 1433 closed everywhere
- [ ] A nightly database backup, copied off-host, **with a tested restore**
- [ ] Log rotation configured for the Docker daemon
- [ ] Committed development credentials rotated — see [SECURITY.md](SECURITY.md#credential-hygiene)
- [ ] *(worth adding)* a `/health` endpoint and a Compose healthcheck for the backend
- [ ] *(worth adding)* rate limiting on `/api/auth/login` and the lead endpoints
