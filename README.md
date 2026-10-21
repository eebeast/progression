# Progression

A local-first workout tracker PWA for recording workouts, reviewing every logged set,
and seeing your activity across phone and laptop. Use it without an account, or enable
optional Supabase sync with Google or GitHub sign-in.

## What the app does

- **Today** — start a day from the four-day Pull / Push / Legs + Abs / Mix preset,
  reorder the rotation, and add runs or body-weight measurements.
- **Workout** — log weight/reps or timed sets, mark warm-ups, recall previous values,
  edit/reorder sets, undo, and view recorded personal bests. Exercises are managed in
  the day plan; the workout screen has no add-exercise dropdown or rest timer.
- **Dashboard** — workout/run charts with week, month, year and custom ranges;
  separate streak and calendar cards; body-weight history; and category drill-downs
  showing each exercise's individual recorded set loads across all completed history.
- **Exercise categories** — Chest, Legs, Back, Shoulder, Core, Arms and Compound.
  Familiar exercise names are preconfigured; new exercises require a category.
  Name aliases help organize the catalog without merging recorded identities.
- **Logbook** — dated workout, run and body-weight records with type/date filters and
  editing. Cycles currently has an empty filter; cycling logging is not implemented.
- **Plans and exercises** — reusable exercise identities, editable prescriptions,
  optional exercise library, archive/merge tools, personal records and top sets.
- **Settings** — appearance, name, height in cm/in, logging preferences, backups,
  account status and conflict review. Signed-in online sessions merge local history
  and sync automatically; no manual refresh/copy/sync buttons are required.
- **Adult BMI** — beneath the body-weight chart, calculated from saved height and the
  latest weight, with CDC adult categories and an outside-reference-range notice.
  This is a screening measure for adults 20+, not a diagnosis; it cannot distinguish
  muscle from fat.
- **PWA** — installable on supported browsers, with offline app-shell caching and a
  deferred update prompt during active workouts or editing.

The product favors recorded facts over coaching. Adult BMI is a user-approved
exception; estimated 1RM, predicted strength, recommended weights and trend advice
remain outside the current scope.

## Run locally

Use **Node.js 22+**.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open <http://127.0.0.1:5173/>. No cloud credentials are required for local-only use.
First launch asks for a name. To check installation/offline behavior, use
the production build rather than Vite development mode:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open <http://127.0.0.1:4173/> online once before testing offline launch. Different
origins, ports and browser profiles have separate IndexedDB data.

## Optional cloud sync and deployment

Deploy the Vite frontend to Vercel and use Supabase for authentication/PostgreSQL.
There is no separate Node backend to deploy. The checked-in Vercel configuration
handles application-route fallbacks.

Copy `.env.example` to ignored `.env.local` for development. Set these **public
browser variables** for the relevant Vercel environments before rebuilding:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

This is Vite, so Vercel integration variables named `NEXT_PUBLIC_*`, `SUPABASE_*`
or `POSTGRES_*` do not automatically configure the frontend. Never put database
passwords, service-role keys or OAuth client secrets in `VITE_*` variables.

Apply checked-in Supabase migrations to each target database independently of the
frontend deployment. Configure Google/GitHub providers in Supabase, register their
Supabase callback URL with each provider, and allow the app's actual
`/auth/callback` URL in Supabase redirect settings. Frontend environment changes
require a new build; already-applied SQL migrations do not run on every deployment.

See [local development and hosted setup](docs/local-development.md) for commands,
OAuth troubleshooting, safe database inspection and recovery.

## Architecture and data

The UI reads/writes through `WorkoutRepository`, injected by `RepositoryProvider`.
Reactive reads use backend-neutral observables; writes return promises.
`DexieRepository` owns IndexedDB. `HttpRepository` is an interface-completeness
stub, not the production backend.

Cloud mode still uses local repositories, with one database per project/account.
Atomic local writes queue an outbox operation; a sync coordinator uses authenticated
Supabase push/pull RPCs. PostgreSQL is relational, while the current physical schema
stores versioned entity payloads as JSONB in a private records table. Browser code
does not query/write that table directly.

Signing in while online merges missing local records into the account, preserves
account preferences and existing differing records, reports skipped collisions, and
retains the original local database. Remote tombstones prevent deleted records from
being reintroduced. Uploads require the app to be open/resumed, online and authenticated;
records remain pending until acknowledged. Conflict review remains explicit.

IndexedDB versions: v1 workouts/settings/exercises/plans; v2 runs; v3 body weights;
v4 sync metadata/outbox/conflicts; v5 reclassifies known shoulder isolations from the
old Arms/Back defaults. Additive optional fields do not require a schema bump.

Weights retain the app's existing active-unit semantics; historical per-entry units
are unavailable. BMI interprets weight in that active unit and converts pounds only
inside its formula. Do not infer or rewrite historical units.

## Verification

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | Authoritative TypeScript check, `tsc -b` |
| `npm test` | Vitest/React Testing Library and repository tests |
| `npm run test:coverage` | Coverage report |
| `npm run build` | Typecheck and production/PWA build |
| `npm run preview` | Serve the production build locally |
| `npm run test:e2e` | Playwright production-browser checks |
| `npm run test:db` | SQL tests against a running local Supabase stack |

Install Chromium with `npx playwright install chromium` before running browser
checks. Local database tests require Docker; Colima is supported. See the setup guide
for the local Supabase command.

CI has separate check, browser and database jobs on pushes/PRs to `main`.
The latest code verification on October 21, 2026 passed 274 unit/integration tests,
five Chromium scenarios (including old/new exercise-ID history) and the production build. Lint had no errors and existing
warnings. SQL tests were last documented as 19 passing locally on October 18; they
were not rerun for the BMI or documentation changes. See the
[status checklist](docs/todo.md) for unverified hosted/device and migration work.

## Backups and privacy

Local-only mode keeps workout data in this browser. Cloud-enabled builds initialize
Supabase authentication; signing in enables account-data upload. Keep JSON exports
before clearing site data, changing deployment origins, or switching storage strategy.

Local-only imports replace current data after confirmation. Account imports merge
entity records with collision checks; they never replay a foreign outbox. Recovery
exports retain sync state and conflict information. Preserve the original export
until reconciliation succeeds.

## For contributors and AI agents

Start with [AGENTS.md](AGENTS.md), then the
[agent development guide](docs/agent-development.md).
The [current product PRD](docs/product-requirements.md) captures accepted behavior;
the [glossary](docs/glossary.md) keeps domain terminology consistent.
The PRD is also published as [GitHub issue #23](https://github.com/eebeast/progression/issues/23)
with the `ready-for-agent` label; the repository copy is the maintained reference.
Obsolete scaffolding/audit/planning files have been removed; Git history retains them.
Do not rebuild delivered features or restore removed controls.

| Current document | Purpose |
| --- | --- |
| [Product PRD](docs/product-requirements.md) | Accepted behavior and scope |
| [Agent guide](docs/agent-development.md) | Code map, workflow and test seams |
| [Glossary](docs/glossary.md) | Domain vocabulary |
| [Local development](docs/local-development.md) | Browser/cloud/deployment setup and recovery |
| [Open work](docs/todo.md) | Remaining tasks only |
| [Dashboard and Logbook](docs/activity-overview.md) | Charts, filters, categories and BMI |
| [Storage decision](docs/storage-architecture-decision.md) | Architecture and sync invariants |
| [Muscle-group research](docs/muscle-group-research.md) | Category research provenance |
