# Testing

There were no tests and no CI. A change was known to work when it did not visibly break the
site. This is what exists now, and what it is for.

---

## One command

```bash
./scripts/verify.sh
```

Runs everything below, in order, and stops at the first failure. Use it before a deploy and
after any change you are not certain about.

**It does not touch your data.** The end-to-end step runs against `docker-compose.test.yml`:
its own compose project (`qre-verify`), its own database (`QatarRealEstateVerify`), its own
volume, its own port (18080), its own passwords. The live stack is never started, stopped or
read, and the test volume is deleted at the end of every run.

| Option | Effect |
|---|---|
| `--skip-frontend` | Don't touch npm |
| `--skip-e2e` | Build and unit-test only — no Docker stack, much faster |
| `--keep` | Leave the verification stack running afterwards, to poke at it |

---

## What it runs

### 1. Backend build

`docker build -f Dockerfile.backend` — a real `dotnet restore` and `dotnet publish` of every
C# project. This is the compile check.

### 2. Backend tests

`tests/RealEstate.Domain.Tests` — xUnit, ~50 cases over the `Property` aggregate and the
value objects it depends on. No database, no mocks, no fixtures: the domain layer has no
dependencies, so these run in milliseconds.

Every test there corresponds to a defect that was found and fixed. They are regression
guards, not coverage:

| File | What it pins down |
|---|---|
| `PropertyStatusRulesTests` | A sold listing cannot be republished by archiving it first. A rental cannot be marked "Sold". Archiving, unpublishing and closing a deal all clear the "Exclusive" flag |
| `PropertyTermsTests` | A sale listing never keeps rent terms, and changing a listing's kind drops the terms of the old one |
| `LocationCoordinateTests` | Coordinates are validated with the same parser that later converts them, in the invariant culture, inside real ranges. `"51,5310"` is refused rather than accepted and then silently dropped |
| `PropertyMediaOrderTests` | Reordering photos sets both the order and the cover, and refuses a list that does not name every photo exactly once |
| `StoredImageTests` | An upload has to look like the image type it claims to be, and the stored filename cannot carry a path or a newline |

Run them directly:

```bash
dotnet test QatarRealEstate.slnx
```

### 3. Frontend

`npm ci`, `npm run lint`, `npx vitest run`, `npm run build`.

The frontend tests live beside the code they cover, in `frontend/src/lib/__tests__/`, and
they cover pure logic only — no component rendering, no jsdom:

| File | What it pins down |
|---|---|
| `numbers.test.js` | The search assistant's budget parser. "I am looking for a villa for sale" must not produce a maximum price of 1,000,000 from the "m" of "am", while "2m" and "٢ مليون" still must |
| `contact.test.js` | `tel:` keeps the country-code plus, `wa.me` gets digits only, and an empty field produces no link at all rather than `wa.me/null` |
| `pricing.test.js` | A map pin never advertises a price above the real one, and the query-string builder repeats an array key instead of comma-joining it |

```bash
cd frontend && npx vitest        # watch mode
cd frontend && npx vitest run    # once
```

### 4. Persistence — the one that matters

This is the regression guard for the bug that started all this: demo data reappearing after
it was deleted. Against the throwaway stack, in order:

1. A fresh deployment has **zero** listings. Demo content is not seeded automatically —
   if this fails, it is being seeded again and the original bug is back.
2. `seed --demo` inserts them when asked.
3. Running `seed --demo` a **second** time inserts nothing. The `SeedHistory` ledger is what
   makes each batch run exactly once.
4. Delete five listings through the API, **restart the application**, and check they are
   still gone — both in the count and individually, by id.
5. Create a listing, publish it, restart, and check it is still there and publicly visible.
6. Edit it, restart, and check the edit survived.

Steps 4 and 6 are the literal scenario that was reported: delete, refresh, and watch it come
back.

---

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

| Job | What it does |
|---|---|
| `backend` | `dotnet restore` / `build` / `test` on the solution |
| `frontend` | `npm ci`, lint, vitest, production build |
| `images` | Builds both Docker images exactly as the server does |
| `persistence` | `./scripts/verify.sh --skip-frontend` — the end-to-end checks above |

---

## What is NOT covered

Worth knowing, so nobody mistakes a green run for more than it is.

- **No handler or controller tests.** The application layer — MediatR handlers, validators,
  authorization filters — has none. It is the biggest gap. A `WebApplicationFactory` test
  suite against a SQL Server container is the natural next step.
- **No component tests.** The React components are covered only by "the production build
  succeeds" and by the pure-logic tests above. Adding `jsdom` plus
  `@testing-library/react` and switching `environment` in `vite.config.js` is the entry
  cost.
- **No query tests.** `PropertyQueries` builds the SQL for every public page. It is
  exercised end-to-end by the persistence run, not directly.
- **No migration tests.** That migrations apply cleanly to an EMPTY database is checked by
  the persistence run. That they apply cleanly to a database with existing data is not, and
  that is the case that matters on a live deploy. Rehearse it with
  `./scripts/restore-db.sh <backup>` followed by pointing a test backend at the restored
  copy.
- **Lint is warnings-only where it disagrees with the architecture.** `eslint.config.js`
  turns off `react-hooks/set-state-in-effect`, which flags the ordinary "fetch on mount,
  setState when it arrives" pattern this app is built on. The rules that catch real mistakes
  — `rules-of-hooks`, `exhaustive-deps`, `no-unused-vars` — stay on.
