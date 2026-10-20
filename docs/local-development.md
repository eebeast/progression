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
Library management remains optional. Today shows the
exercise list beside the rotation on large screens. Optional summaries are under
**Activity → View activity overview**, rather than in the workout-start flow.

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
renders on desktop, and the editor has one exercise-name field. Real installed
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


## Verified local checkpoint (October 18, 2026)

- 137 Vitest tests across 28 files pass.
- 19 SQL tests pass against Supabase on Colima.
- 2 Chromium production-build scenarios pass: offline browser restart/undo and
  the exact desktop plan plus simplified editor.
- Typecheck and production build pass. Lint has warnings but no errors; the build
  retains the existing large-bundle warning.
- Review findings about oversized imports, deleted parents, dependent conflicts,
  preferences blocking history copy, repeated assignments and recovery revision
  selection were fixed with regression coverage.

These checks do not replace the hosted/device/migration gates in `todo.md`.
