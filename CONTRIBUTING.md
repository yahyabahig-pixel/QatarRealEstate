# Contributing

Thanks for taking the time. This guide covers how the code is organised, the conventions that keep it coherent, and what a reviewer will look for.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first if you have not — most review comments on this codebase trace back to one of the rules it explains.

---

## Getting set up

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md). The short version:

```bash
cp .env.example .env    # fill in SA_PASSWORD, JWT_SECRET, MAIN_ADMIN_*
docker compose up -d --build
```

For backend work you will want the .NET 10 SDK and `dotnet tool restore`; for frontend work, Node 22+. The frontend runs standalone in mock mode with no backend at all — leave `VITE_API_URL` unset.

---

## The five rules

Almost every review comment reduces to one of these.

### 1. Business rules live in the domain

An invariant belongs on the aggregate, as a method returning `Result<T>`. Not in a handler, not in a validator, not in a controller.

```csharp
// ✅ the aggregate decides
public Result<Updated> Publish()
{
    if (Status == PropertyStatus.Published) return PropertyErrors.AlreadyPublished;
    if (Status is Archived or Sold or Rented) return PropertyErrors.NotPublishable;
    Status = PropertyStatus.Published;
    return Result.Updated;
}

// ❌ the handler decides — now the rule is unenforceable from anywhere else
if (property.Status == PropertyStatus.Archived)
    return Error.Conflict("Property.NotPublishable", "…");
```

FluentValidation is for **shape** — is the field present, is the page size within bounds, is the string short enough. If a check needs the database or knowledge of the aggregate's state, it is a domain rule.

### 2. Every handler returns `Result<T>`

Expected failures are values. Exceptions are for bugs.

```csharp
// ✅
if (property is null) return PropertyErrors.NotFound;

// ❌
if (property is null) throw new NotFoundException(...);
```

Let `ResultExtensions` choose the status code. Do not return `NotFound()` or `BadRequest()` from a controller.

### 3. Dependencies point inward

```
Api → Application → Domain
Infrastructure → Application
```

`Application` must never reference EF Core, `HttpContext` or any concrete infrastructure type. If a handler needs something from the outside, declare an interface in `Application/abstractions/` and implement it in `Infrastructure`.

### 4. Modules never reference each other

`RealEstate.*` must not reference `Auth.*`, and vice versa. If both need something, it sinks into `BuildingBlocks` — it does not travel sideways.

This is the rule that makes the modular monolith worth its extra projects. A PR that adds a cross-module project reference will be asked to change.

### 5. Reads and writes use different paths

| | Write | Read |
|---|---|---|
| Abstraction | `I*Repository` | `I*Queries` |
| Returns | tracked aggregates | DTO records |
| Tracking | tracked | `AsNoTracking()` |

Do not add a `GetAllAsync` returning entities to a repository so that a query can use it. Do not project to a DTO inside a repository.

---

## Adding a feature

The full worked example is in [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md#adding-a-feature--the-vertical-slice-recipe). The shape:

```
RealEstate.Application/<Aggregate>/<Admin|User>/<Command|Queries>/<UseCase>/
    <UseCase>Command.cs      sealed record : ICommand<T>
    <UseCase>Handler.cs      internal sealed, primary-constructor injection
    <UseCase>Validator.cs    optional, shape only
```

Then a domain method if there is a rule, an EF configuration change plus a migration if there is a column, and one controller action.

MediatR and FluentValidation both scan the assembly, so nothing needs registering.

---

## Conventions

| Element | Convention |
|---|---|
| Commands / queries | `sealed record`, positional parameters |
| Handlers | `internal sealed class`, primary constructor |
| Domain entities | `sealed` where possible · `private set` · private constructor · static `Create → Result<T>` |
| Value objects | `sealed record` with a static `Create → Result<T>` |
| Domain errors | one static class per aggregate in `DomainErrors/`, expression-bodied properties |
| Collections on aggregates | private backing field, `IReadOnlyCollection<T>` exposed, `PropertyAccessMode.Field` in the EF config |
| Repositories | narrow and concrete — no generic `IRepository<T>`, no `IQueryable` escaping the boundary |
| Query services | `AsNoTracking()` + `Select`; extract a shared `static Expression` when a shape repeats |
| Async | always `CancellationToken`, always `Async` suffix |
| Comments | explain **why**, not what. This codebase's comments are unusually good — match them |

### The existing inconsistencies

The repository already contains some naming drift. **Match the surrounding code**; do not fix these in an unrelated PR, and do not copy them into new files either:

- write folders are singular `Command`, read folders are plural `Queries`
- `Behaviors/` (US) in the modules, `Behaviours/` (UK) in BuildingBlocks
- a directory named `Configurations.cs`, another named `Dtos ` with a trailing space
- `namespace RealEstate.Domain.DomainErros` — a typo replicated across all fifteen files
- six Application files with no namespace at all

A PR that cleans these up on their own is welcome. A PR that mixes them with a feature is not.

---

## Commits and branches

Conventional commits, matching the existing history:

```
feat(realestate): add agent archiving
fix(auth): reject blank permission names on assignment
chore(docker): pin the nginx base image
docs(architecture): document the modular-monolith seams
refactor(frontend): extract the listing filter panel
```

Scopes in use: `realestate`, `auth`, `frontend`, `docker`, `deploy`, `docs`.

Branches: `feat/<short-description>`, `fix/<short-description>`. Target `Development`.

---

## Before you open a PR

- [ ] `dotnet build` succeeds with no new warnings
- [ ] `cd frontend && npm run build` succeeds
- [ ] **`dotnet ef migrations has-pending-model-changes`** returns clean for any context you touched — [this one has bitten the project before](docs/DATABASE.md#a-cautionary-tale-worth-reading)
- [ ] No secret, connection string, token or private hostname is in the diff
- [ ] New endpoints carry `[HasPermission(...)]`, and any new permission is added to `AppPermissions.Catalog`
- [ ] Business rules are in the domain, not in the handler
- [ ] Every new handler returns `Result<T>`
- [ ] No cross-module project reference was added
- [ ] Comments explain intent where the code is non-obvious
- [ ] Docs updated if you changed an endpoint, the schema, or a deployment variable

### For reviewers

Beyond correctness, the things worth pushing back on:

1. A business rule that escaped the domain
2. A cross-module reference
3. A repository that projects, or a query service that returns entities
4. A new endpoint with no permission attribute
5. A model change with no migration
6. A `pageSize` or `take` parameter with no upper bound — [several already exist](docs/API.md#pagination)
7. Anything that widens one of the [known gaps](docs/ARCHITECTURE.md#15-known-limitations-and-engineering-backlog)

---

## Tests

There is **no test project in the solution today**. That is a known gap, and contributions that add one are especially welcome.

If you are starting: domain invariants are the highest-value and lowest-friction target. `Property.Publish()`, `SaleTerms.Create`, `Money.Create`, `Position.AssignPermission` and `Location.Create` are pure functions over their inputs — no database, no host, no container. A single `xunit` project covering them would catch real regressions on day one.

Suggested layout:

```
tests/
├─ RealEstate.Domain.Tests/          pure, fast, no infrastructure
├─ RealEstate.Application.Tests/     handlers with substituted abstractions
└─ Api.IntegrationTests/             WebApplicationFactory + Testcontainers
```

---

## Reporting bugs

Include: what you did, what you expected, what happened, and the **correlation id** from the failing response if there was one — every log line for a request carries it, which makes a report immediately actionable.

Security issues should not go in a public issue. See [docs/SECURITY.md](docs/SECURITY.md#reporting-a-vulnerability).

---

## Screenshots

Replacing the placeholder images is a genuinely useful contribution. See [docs/images/README.md](docs/images/README.md) for filenames and sizing.
