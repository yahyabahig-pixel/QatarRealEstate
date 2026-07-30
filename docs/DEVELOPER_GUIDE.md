# Developer Guide

> How to run it, how to change it, and the conventions and traps that are not obvious from reading a single file.

- [Prerequisites](#prerequisites)
- [Running the stack](#running-the-stack)
- [Running without Docker](#running-without-docker)
- [Frontend](#frontend)
- [Adding a feature — the vertical slice recipe](#adding-a-feature--the-vertical-slice-recipe)
- [Adding a permission](#adding-a-permission)
- [Adding a module](#adding-a-module)
- [Conventions](#conventions)
- [Traps and gotchas](#traps-and-gotchas)
- [Debugging](#debugging)

---

## Prerequisites

| For | You need |
|---|---|
| Running the whole stack | Docker + Docker Compose. Nothing else |
| Backend development | .NET 10 SDK (pinned in `global.json`), `dotnet-ef` (`dotnet tool restore` — see `dotnet-tools.json`), a reachable SQL Server |
| Frontend development | Node 22+ |

---

## Running the stack

```bash
git clone https://github.com/ahmedgndy/QatarRealEstateAPI.git
cd QatarRealEstateAPI
cp .env.example .env
```

Fill in `.env`. The minimum set that must be non-empty:

| Variable | Notes |
|---|---|
| `SA_PASSWORD` | 8+ chars, upper + lower + digit. `openssl rand -base64 24 \| tr -dc 'A-Za-z0-9' \| head -c 20` then append something like `aZ9` |
| `JWT_SECRET` | **32 characters minimum** — the app throws at startup otherwise. `openssl rand -base64 48` |
| `MAIN_ADMIN_EMAIL`, `MAIN_ADMIN_PASSWORD` | Blank makes `AuthSeeder` throw and the backend crash-loop. That is deliberate |
| `PUBLIC_ORIGIN` | The URL browsers use. **Baked into the JS bundle at build time** |
| `SEED_DATA` | `true` for the first run, then `false` |

Then:

```bash
docker compose up -d --build
docker compose logs -f backend
```

Watch for `Now listening on: http://[::]:8080`. First boot takes 30–60 seconds because SQL Server has to warm up before migrations can run — the startup code retries for up to 100 seconds, so a few "Database not reachable yet" warnings are expected, not a failure.

| | |
|---|---|
| Site | `http://localhost` |
| Admin | `http://localhost/admin/login` |
| API through the edge | `http://localhost/api/...` |

### Useful commands

```bash
docker compose ps                       # what is running, and what is published
docker compose logs -f backend          # API logs with correlation ids
docker compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT COUNT(*) FROM realestate.Properties"

docker compose build backend && docker compose up -d      # after a C# change
docker compose build frontend && docker compose up -d     # after a JS change OR a PUBLIC_ORIGIN change
docker compose down                     # stop everything; named volumes survive
docker compose down -v                  # ⚠️ also destroys the database
```

> **`docker compose restart frontend` does not pick up a changed `PUBLIC_ORIGIN`.** Vite inlines it into the bundle at *build* time. You must rebuild the image. Getting this wrong produces a site that renders headings with no data — which looks exactly like the backend being down.

---

## Running without Docker

### Backend

```bash
# SQL Server in a container, everything else on the host
docker run -d --name qre-sql -p 1433:1433 \
  -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='<your password>' -e MSSQL_PID=Express \
  mcr.microsoft.com/mssql/server:2025-latest

cd src/Host
dotnet user-secrets set "ConnectionStrings:RealEstateDb" "Server=localhost,1433;Database=QatarRealEstate;User Id=sa;Password=<your password>;TrustServerCertificate=True;"
dotnet user-secrets set "Jwt:Secret" "$(openssl rand -base64 48)"
dotnet user-secrets set "MainAdmin:Email" "you@example.com"
dotnet user-secrets set "MainAdmin:Password" "<something valid>"

dotnet run
```

Migrations and seeding run automatically in Development. OpenAPI is served at `/openapi/v1.json` — also Development only.

> **Use `dotnet user-secrets`, not `appsettings.Development.json`.** That file is committed and already contains placeholder credentials that must be treated as public.

### Frontend

```bash
cd frontend
npm install

# Live mode — point at the running API
echo 'VITE_API_URL=http://localhost:5222' > .env.local
npm run dev
```

Leaving `VITE_API_URL` **empty or unset switches the app into mock mode**: it runs entirely on `src/data/mockData.js`, the admin login accepts a demo account, and image uploads become `FileReader` data URLs. That is genuinely useful for UI work with no backend running.

---

## Frontend

React 19 · Vite 8 · Tailwind v4 · react-router 7. JavaScript, not TypeScript. No test framework and no linter config.

```
src/
├─ api/         client.js (the one fetch wrapper + token store)
│               realEstateApi.js (bindings + DTO→UI mappers)
│               adminApi.js, authApi.js
├─ store/       AuthContext.jsx (session), DataContext.jsx (all business data)
├─ pages/       9 public page modules
├─ admin/       AdminLayout, Login, Dashboard, PropertiesAdmin, CrudPages,
│               AuthAdminPages, adminUi.jsx, guards.jsx
├─ components/  PropertyCard, ListingsMap, LocationPicker, Navbar, Footer, ui.jsx …
├─ lib/         mapbox.js (lazy CDN loader), geo.js, featureIcons.jsx
├─ config/      company.js — brand, contact and legal strings, single source
└─ index.css    the entire design system
```

### The design system

Tailwind v4 is CSS-first — **there is no `tailwind.config.js`**. All tokens live in the `@theme` block at the top of `src/index.css`:

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#EF233C` | Buttons, accents, badges |
| `--color-primary-dark` | `#D90429` | Hover |
| `--color-ink` | `#2B2D42` | Headers, nav, dark sections |
| `--color-mist` | `#8D99AE` | Secondary text |
| `--color-coal` | `#232438` | Dark admin surfaces |

Plus a lavender-tinted `neutral-50…950` ramp hue-matched to `mist`, the Plus Jakarta Sans stack, and two custom shadows. `@layer components` defines the shared vocabulary — `.card`, `.lift`, `.field`, `.btn-primary`, `.chip`, `.badge-*`, `.skeleton`.

> The palette is currently declared **twice**: once in `@theme` and again as raw `:root` variables for the map CSS. A brand change means editing both.

### The one HTTP chokepoint

Everything goes through `src/api/client.js`. There is no scattered `fetch`.

- The JWT lives in **`sessionStorage` under `qre.accessToken`** — cleared when the tab closes.
- A module-level `onUnauthorized` hook lets `AuthContext` clear the token and flip to anonymous on any 401.
- `ApiError` carries `status`, the RFC 9457 `problem` body and a flattened `errors` array.
- `DataContext.guard()` converts every mutation into `{ ok, value } | { ok, error, status }` so pages never throw and forms stay open on failure.
- The query-string builder drops `''` and `null`, so C# record-constructor binding sees genuinely absent parameters rather than empty strings.

### Frontend caveats worth knowing before you touch it

1. **Server-side pagination is bypassed.** `DataContext` fetches `pageSize=100` once and `Listings` paginates that array client-side. Listing #101 is unreachable, and filters operate on a truncated set.
2. **Type and amenity filter chips cannot match live data** — `mapPropertyListItem` hardcodes `type`, `area`, `district` and `amenities` as empty, while the filter options are still imported from `mockData.js`.
3. **Seven admin routes have no `PermissionRoute` guard**, so a user can reach a page whose every action then 403s. Cosmetic — the API re-checks.
4. **`SettingsAdmin` writes nowhere.** It toasts "saved" while only calling `setSettings` in React state; there is no settings backend.
5. **"Remember me" on the login form is inert** — the token always goes to `sessionStorage`.
6. **No code splitting** — every route is in the entry chunk, including the 426-line map component.

---

## Adding a feature — the vertical slice recipe

Adding "archive an agent" to the RealEstate module. Five files, and the order matters.

### 1. Domain — the rule lives here

```csharp
// RealEstate.Domain/Entities/Agent.cs
public Result<Updated> Archive()
{
    if (IsArchived)
        return AgentErrors.AlreadyArchived;

    IsArchived = true;
    return Result.Updated;
}
```

Add the error to `DomainErrors/AgentErrors.cs`, choosing the `Error.*` factory that maps to the HTTP status you want:

```csharp
public static Error AlreadyArchived =>
    Error.Conflict("Agent.AlreadyArchived", "Agent is already archived.");   // → 409
```

### 2. Application — the use case

`RealEstate.Application/Agents/Admin/Command/ArchiveAgent/`:

```csharp
// ArchiveAgentCommand.cs
public sealed record ArchiveAgentCommand(Guid AgentId) : ICommand<Updated>;

// ArchiveAgentHandler.cs
internal sealed class ArchiveAgentHandler(IAgentRepository agents, IUnitOfWork unitOfWork)
    : ICommandHandler<ArchiveAgentCommand, Updated>
{
    public async Task<Result<Updated>> Handle(ArchiveAgentCommand command, CancellationToken ct)
    {
        var agent = await agents.GetByIdAsync(command.AgentId, ct);
        if (agent is null)
            return AgentErrors.NotFound;

        var archived = agent.Archive();
        if (archived.IsError)
            return archived.TopError;

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Updated;
    }
}

// ArchiveAgentValidator.cs — shape only. Rules belong in the aggregate.
internal sealed class ArchiveAgentValidator : AbstractValidator<ArchiveAgentCommand>
{
    public ArchiveAgentValidator() => RuleFor(x => x.AgentId).NotEmpty();
}
```

Both are picked up automatically — MediatR and FluentValidation scan the assembly.

### 3. Infrastructure — only if you need new persistence

Usually nothing. If you added a column, add it to the EF configuration and generate a migration.

### 4. Api — the route

```csharp
[HttpPost("{id:guid}/archive")]
[HasPermission(AppPermissions.Agent.Update)]
public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    => (await Sender.Send(new ArchiveAgentCommand(id), ct)).ToNoContent();
```

### 5. Frontend

Add the call to `src/api/realEstateApi.js`, then wire it through `DataContext`.

### The rules this recipe encodes

| Do | Don't |
|---|---|
| Put invariants in the aggregate | Put them in the handler or the validator |
| Return `Result<T>` from every handler | Throw for expected failures |
| Use FluentValidation for **shape** | Use it for business rules that need the database |
| Let `ResultExtensions` choose the status code | Return `NotFound()` or `BadRequest()` directly |
| Keep the handler thin — load, call, save | Put an `if` chain of business rules in it |

---

## Adding a permission

Two edits, no migration:

```csharp
// 1. BuildingBlocks.Authorization/AppPermissions.cs
public static class Agent
{
    public const string Archive = "Agent.Archive";
}

// …and add it to the Catalog list at the bottom of the file — this is what
// Position.AssignPermission validates against.
```

```csharp
// 2. The endpoint
[HasPermission(AppPermissions.Agent.Archive)]
```

`PermissionPolicyProvider` builds the `perm:Agent.Archive` policy on demand. Administrators can grant it through `POST /api/positions/{id}/permissions` immediately. Existing tokens will not carry it until their holders log in again.

---

## Adding a module

See [ARCHITECTURE.md §14](ARCHITECTURE.md#14-extending-the-platform-with-a-new-module). Five projects, one schema, permissions appended, three lines in `Program.cs`, one line in `DatabaseStartupExtensions`. No existing module changes.

---

## Conventions

### Naming and layout

```
<Aggregate>/<Admin|User>/<Command|Queries>/<UseCase>/
    <UseCase>Command.cs     or  <UseCase>Query.cs
    <UseCase>Handler.cs
    <UseCase>Validator.cs   (optional)
```

Note the asymmetry that already exists in the codebase: the write folder is singular `Command`, the read folder is plural `Queries`. Match the surrounding code rather than fixing it in passing.

| Element | Convention |
|---|---|
| Commands/queries | `sealed record`, positional parameters, `ICommand<T>` / `IQuery<T>` |
| Handlers | `internal sealed class`, primary constructor injection |
| Validators | `internal sealed`, shape only |
| Domain entities | `sealed` where possible, `private set`, private constructor, static `Create → Result<T>` |
| Value objects | `sealed record` with a static `Create → Result<T>` |
| Domain errors | static class per aggregate in `DomainErrors/`, expression-bodied properties |
| Repositories | narrow and concrete — no generic `IRepository<T>`, no `IQueryable` escaping |
| Query services | `AsNoTracking()` + `Select` into a DTO, shared `static Expression` where a shape repeats |

### Git

Conventional commits, as already used in the history:

```
feat(realestate): add agent archiving
fix(auth): reject blank permission names on assignment
chore(docker): pin the nginx base image
docs(architecture): document the modular-monolith seams
```

---

## Traps and gotchas

### Always check for model drift

The single worst outage in this repository's history was a model property added without a migration. The whole application failed at startup with `Invalid column name 'PriceOnRequest'` — including code paths unrelated to the change — because every query that materialises a `Property` selects that column.

**Before committing any change to an entity or an EF configuration:**

```bash
dotnet ef migrations has-pending-model-changes \
  --project src/Modules/RealEstate/RealEstate.Infrastructure \
  --startup-project src/Host --context RealEstateDbContext
```

### `PUBLIC_ORIGIN` is a build-time value

Covered above, and it is the most common deployment mistake in this stack. Change it → rebuild the frontend image.

### Validation runs twice

Both modules register their own `ValidationBehavior<,>` as an open generic into the same container, so every request runs both. If you are counting validator invocations in a debugger, that is why.

### `Result<T>` implicit conversions can surprise you

`return someError;` and `return someValue;` both compile inside a method returning `Result<T>`. That is the point — but it means a typo can change the meaning of a return without a compiler error. `TopError` on a *successful* result returns `default(Error)` silently rather than throwing.

### Filenames and namespaces that will trip your tools

These exist in the codebase today. Do not "fix" them casually — some are load-bearing for MSBuild globs — but know they are there:

| Oddity | Where |
|---|---|
| A **directory** named `Configurations.cs` | `RealEstate.Infrastructure/Data/` |
| A directory named `Dtos ` — **with a trailing space** | `…/GetPropertyDetails/` — breaks tools that round-trip paths through a shell or a zip |
| `ListingKind.CS` — uppercase extension | `RealEstate.Domain/Enums/` |
| `Propertytype.cs` — lowercase `t` | `RealEstate.Domain/Entities/` |
| `namespace RealEstate.Domain.DomainErros` — typo, consistent across all 15 files | `DomainErrors/` |
| Six Application files with **no namespace at all** | various |
| `RealEstateDbContext` in the global namespace | `Data/` |

### Seeded data is invisible to scoped admins

Seeding runs with no HTTP context, so all 49 demo listings have `CreatedBy = null`. Owner-scoped admin queries filter on `CreatedBy == currentUser`, so a non-privileged admin sees an empty list and assumes something is broken. It is not.

### The `Draft` listing is publicly readable

`GET /api/properties/{id}` applies no visibility filter. If you are testing "unpublish hides it", it does not — see [ARCHITECTURE.md §15](ARCHITECTURE.md#15-known-limitations-and-engineering-backlog).

---

## Debugging

### Correlation ids

Every log line carries the request's `TraceIdentifier`, pushed into Serilog's `LogContext` by the first middleware in the chain. Grab it from a failing response and grep:

```bash
docker compose logs backend | grep "0HN7GK5T2QJ8L:00000003"
```

### Where to look when…

| Symptom | Look at |
|---|---|
| 400 with a field dictionary | The FluentValidation validator for that command |
| 403 on an admin route | The `[HasPermission]` attribute, then whether the position actually grants it, then whether the token predates the grant |
| 404 on a valid-looking id | Whether the handler checked existence, or whether a missing validator let `Guid.Empty` through |
| 500 | `GlobalExceptionHandler` logged the full exception with the correlation id. The response body is deliberately vague outside Development |
| Site renders but has no data | `PUBLIC_ORIGIN` / `VITE_API_URL` mismatch — check the Network tab for calls to the wrong origin, or blocked mixed content |
| `Invalid column name '…'` at startup | Model drift — a missing migration |
| `host not found in upstream "backend"` from nginx | The backend container is not up, or the service name changed |
