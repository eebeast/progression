# Run and verify Progression locally

Use Node.js 22 or newer (required by the installed Supabase client).

## Browser development

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open <http://127.0.0.1:5173/>. Cloud configuration is optional; without it, the
existing local-only application works normally. Development mode does not install
the production service worker. To inspect the installable/offline build:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open <http://127.0.0.1:4173/> online once. The service worker then prepares the
application shell for offline use. These two ports have separate browser storage.

## Your four-day plan

New local databases start with Pull, Push, Legs + Abs, and Mix in that order,
using the exact exercise names and prescriptions supplied in the conversation.
Existing databases are not overwritten. Open **Plans → Use four-day plan** to
apply the preset after downloading a backup. Old days remain under **Plan options
→ Previous days** and logged workouts retain their names and prescriptions.

Day editing keeps the original name/sets/reps flow. The single exercise-name field
has no dropdown or autocomplete suggestions and keeps stable exercise identity behind the UI.
The workout screen shows planned exercises without an add-exercise form. Rest timer controls have been removed.
Library management remains optional. Today shows the exercise list beside the
rotation on large screens and has Add run/Add weight entry points. **Dashboard**
contains the combined activity charts, seven categories (including Shoulder),
separate streak/calendar cards and adult BMI beneath body-weight history.
**Logbook** contains editable workout/run/body-weight records and type/date filters.
See the [current PRD](product-requirements.md) for accepted behavior.

## Local Supabase through Colima

Ensure Colima/Docker is running, then:

```sh
npx supabase start -x studio,imgproxy,inbucket,realtime,storage-api,edge-runtime,logflare,vector,supavisor
npm run test:db
```

The CLI creates a development-only database/auth/API stack and applies checked-in
migrations. SQL tests run in a rolled-back transaction. Do not use production data
or credentials for these tests. `npx supabase status` reports local endpoints and keys.

The physical schema uses private, account-scoped JSON payload records instead of
recreating every legacy field as a SQL column. This preserves unknown legacy values.
Only authenticated push/pull functions are exposed. Push checks versions and
same-account references against the final atomic group, records immutable receipts,
and appends a serialized account journal. Private tables have RLS and no browser
schema grants. See the migration and SQL tests for the enforced contract.

## Hosted Google and GitHub sign-in

1. Create a free Supabase project and apply the checked-in SQL migrations to that
   new project after reviewing them. Keep the current local source and backups.
2. Create an OAuth app for each provider you want. Register the callback URL shown
   in that provider's Supabase settings with Google or GitHub, and configure any
   provider consent/test-user requirements.
3. Enter each provider's client ID and secret in its Supabase provider settings.
   Provider secrets belong there, not in frontend code.
4. Configure Supabase's site URL and allowlist the app's `/auth/callback` URL for
   localhost and the actual deployment. The configured Vite port must match.
5. Copy `.env.example` to ignored `.env.local`, set the project URL and public
   publishable key, then restart Vite. Never add a service-role key to the frontend.
6. Sign in from Settings. When online, the app merges local records into the signed-in
   account and syncs them automatically. Existing account records are preserved when
   IDs collide, and the original local database is retained. Account IDs and project
   hosts partition local data.

OAuth callback, consent and installed-app return behavior still require a real
configured project and manual device verification. They are not established by
local SDK mocks or the SQL tests.

## Vercel deployment and database migrations

Use Vercel's Vite build: `npm run build`, output directory `dist`. Keep the checked-in
`vercel.json` route rewrites and service-worker cache header. Set the following
public variables for each environment you deploy, then create a new build:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

These exact names are read by the client. Integration variables such as
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY` and
`POSTGRES_*` do not automatically populate the Vite variables. Copy only the public
project URL/key into the corresponding Vite entries. Never expose a database
password, service-role key or OAuth client secret in a frontend variable.

Database migrations are a separate operation. The repository already has Supabase
configuration; do not run init again for each frontend deploy. For a new target:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Review the linked target and pending SQL before applying it. Apply pending migrations
once per target database and whenever new SQL migrations are introduced. Frontend
redeployments do not create private tables or run SQL automatically. Creating optional
JSON fields such as height/BMI inputs is not itself a new SQL migration.

For OAuth, there are two different callback settings:

- Google/GitHub OAuth app callback: the URL Supabase displays, commonly
  `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
- Supabase allowed app redirect: `https://YOUR_APP_DOMAIN/auth/callback` and the
  matching local URL, for example `http://127.0.0.1:5173/auth/callback`.

Set Supabase's Site URL to the actual production origin. Configure each provider's
credentials and enable it in Supabase. The app processes its callback before the
onboarding/routing gate and returns to Settings after exchanging the code.

## Inspecting data and troubleshooting

Supabase uses relational PostgreSQL. This app's current physical model has private
account-scoped JSONB payloads rather than a normalized table for each exercise/set.
Use the privileged Supabase SQL Editor for inspection; do not expose the private
schema to the browser or bypass the authenticated RPC protocol.

```sql
select store,
       count(*) filter (where data is not null) as live_records,
       count(*) filter (where data is null) as deleted_records
from workout_private.records
group by store
order by store;

select id, version, data, updated_at
from workout_private.records
where store = 'logs' and data is not null
order by updated_at desc
limit 20;
```

The SQL Editor can see multiple accounts; do not share payloads or account identifiers
in logs/issues. The browser's sync functions enforce the signed-in account boundary.

| Symptom | Check |
| --- | --- |
| `relation workout_private.records does not exist` | The checked-in SQL migration must be applied to the intended project. Frontend deployment does not create it. |
| `Cloud sync is not configured` | Exact `VITE_*` names and public values in that deployment environment, followed by a fresh build. |
| `Unsupported provider: provider is not enabled` | Enable that Google/GitHub provider and save credentials in Supabase. |
| Return to localhost or access denied | Supabase Site URL, allowed app callback, provider's Supabase callback and consent/test-user settings. Production must not use the local origin. |
| No records in the private table | Sign in, keep the app open online, check pending/error/conflict status and inspect the correct Supabase project/account. Queueing is not acknowledgement. |
| Installed app still shows old controls | Apply the PWA update when safe; confirm the app origin matches the deployment and avoid clearing IndexedDB without a backup. |

Category types/presets currently live in code, while each exercise's chosen category
is part of its synced payload. There is no separate SQL category catalog. Shoulder
reclassification is a local IndexedDB data migration; remote taxonomy ownership and
already-synced category reconciliation need a separate reviewed change.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:db
npx playwright install chromium
npm run test:e2e
```

The browser suite builds the production app on port 4173. It verifies an offline
set survives closing/reopening Chromium, undo works, the requested four-day plan
renders on desktop, the editor has one exercise-name field, records flow from Today
to Dashboard/Logbook, and charts fit desktop/mobile/dark themes. Real installed
Android/iOS checks and the personal-export reconciliation remain release gates.

## Backup and recovery

Version 1 backups remain readable. Version 2 exports add accepted remote versions,
pending intent and conflicts. Account imports copy entity records through new
versioned operations; they never replay a foreign outbox. Automatic local-to-account
merging skips records whose IDs already exist with different values, preserving the
account copy and the untouched original local database. Conflicted exports can
be recovered into a local-only repository for review without uploading anything.
The saved local values and accepted cloud copies remain available for an explicit
choice in Settings. Keep the original recovery file until reconciliation succeeds.

Large account imports create bounded, parent-first operations in the same local
transaction. Retrying sends stable operation IDs. A local history import is not
considered synced merely because it was queued: check pending/error/conflict status
and reconcile the downloaded source with a destination export.

Before cloud cutover, rollback uses the retained local deployment/database. After
cloud edits begin, export current account data and resolve pending work before
returning to a local-only build. Reverting code alone does not copy cloud changes
back to the original browser database. No source data should be deleted as part
of release cleanup.


## Verification checkpoints

Latest code verification, October 21, 2026:

- 274 Vitest tests across 38 files pass, including alias history, two-client sync,
  preset ID reuse, adult BMI and Shoulder migration.
- Five Chromium production-build scenarios pass: navigation/record flow, responsive
  charts/themes, old/new Bench Press history, offline restart/undo and desktop plans.
- Typecheck and production build pass. Lint has 26 existing warnings and no errors;
  the build retains the existing large-bundle warning.
- SQL tests were last documented as 19 passing locally on Supabase/Colima on
  October 18, 2026. They were not rerun for the BMI/documentation changes.

These checks do not replace the hosted/device/migration gates in `todo.md`.
