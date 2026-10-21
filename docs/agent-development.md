# Agent development guide

Updated October 20, 2026. Read [AGENTS.md](../AGENTS.md),
[the PRD](product-requirements.md) and [open tasks](todo.md) before changing
the app. Use the [glossary](glossary.md) for domain terms.

## First pass

1. Inspect the working tree and current branch. Preserve unrelated user changes.
2. Identify the requested behavior and whether it is already implemented. Obsolete
   prompts/plans have been removed; do not scaffold a replacement app from Git history.
3. Read the relevant current doc and source module. For sync/storage changes, read
   the architecture decision and the actual migration/RPC contract.
4. Keep changes focused and reviewable. Use a new feature/fix branch when starting
   independent work and make small commits; do not switch away from in-progress work
   without accounting for it.
5. Implement through existing seams, validate the behavior, update docs and report
   what changed, what was tested and what still needs hosted/device verification.

## Code map

| Concern | Entry points |
| --- | --- |
| Routes and visible navigation | `src/App.tsx`, `src/components/AppShell.tsx` |
| Today and rotation | `src/pages/Dashboard.tsx`, `src/components/TodayEntries.tsx`, `src/utils/program.ts` |
| Dashboard charts | `src/pages/Analytics.tsx`; `Activity.tsx` re-exports it |
| Logbook and record editing | `src/pages/History.tsx`, `HistoryDetail.tsx`, shared run/weight rows |
| Workout entry and snapshots | `src/pages/Workout.tsx`, `src/components/SetList.tsx`, `SetRow.tsx` |
| Plans, presets and exercise library | `src/pages/TemplateEditor.tsx`, `Templates.tsx`, `Exercises.tsx`, `src/storage/defaults.ts` |
| Category identity and catalog | `src/utils/muscleGroups.ts`, `categoryExercises.ts`, `src/types/index.ts` |
| Per-set load history | `src/utils/setLoads.ts`, `src/components/CategoryRecords.tsx` |
| Height and adult BMI | `src/pages/Settings.tsx`, `src/utils/bmi.ts`, `src/components/BmiSummary.tsx` |
| Repository contract/adapters | `src/storage/repository.ts`, `dexie/DexieRepository.ts`, `http/HttpRepository.ts` |
| Auth and account lifecycle | `src/auth/client.ts`, `CloudProvider.tsx`, `accountCache.ts` |
| Sync and remote calls | `src/storage/sync/coordinator.ts`, `supabaseTransport.ts`, `types.ts`, `dependencies.ts` |
| SQL security/protocol | `supabase/migrations/`, `supabase/tests/database/` |
| Backup validation/reconciliation | `src/storage/legacyBackup.ts`, `reconciliation.ts` |
| PWA lifecycle and hosting | `src/components/PwaStatus.tsx`, `InstallSection.tsx`, `vite.config.ts`, `vercel.json` |

## Decisions future changes must preserve

- **Keep logging simple.** Existing theme/fonts/tokens remain consistent on phone
  and laptop. Plan editing has a plain exercise-name input, sets/reps and category
  choice. Do not restore dropdown/autocomplete name pickers, rest-timer controls,
  or an add-exercise form inside the workout screen.
- **Keep records where users expect them.** Today records runs/weight. Dashboard
  charts them. Logbook owns their editable record lists. Streak and calendar are
  separate cards; date controls fit phone widths.
- **Protect original identities.** Verified aliases can share a read-only history
  across exercise IDs via `utils/exerciseHistory.ts`. Preserve every original set;
  do not rewrite IDs or fuzzy-match custom movements. Distinct equipment/category
  choices and `separateHistory` stay separate. Preset/plan entry reuses compatible
  existing aliases. Rename/archive/explicit-merge behavior retains snapshots/audits.
  A sole matching alias is not automatically compatible: compare its saved category
  and equipment with the requested catalog movement before reusing it. Workout
  prefill tags history by the requested exercise/session, not returned alias log IDs.
- **Use every recorded set.** Category drill-downs show all exercises and all
  working-set loads, including zero added weight. They are independent of the
  workout/body-weight chart period and optional gym filters.
- **Category definitions currently live in code.** Exercise records persist their
  chosen category and sync with the record. There is no shared SQL category/catalog
  lookup table. The [proposed shared catalog design](storage-architecture-decision.md#proposed-shared-catalog-design)
  covers reference releases, offline cache and compatibility migration; it is not implemented.
- **Shoulder is included.** Known shoulder isolations use Shoulder; overhead presses
  remain Compound under the current single-category scheme. Dexie v5 upgrades known
  old Arms/Back assignments. Do not assume this is a hosted SQL taxonomy migration.
- **BMI is the approved calculation exception.** Use saved height and latest
  non-future measurement with active-unit semantics. Missing/invalid values never
  become a fabricated result. Use CDC adult 20+ ranges with screening/muscle-mass
  context; no diagnosis, disease prediction or new individualized advice.
- **Keep repositories as the UI seam.** New repository methods update the interface,
  Dexie implementation and HTTP stub together. Production cloud reads still come
  from local repositories; Supabase access belongs to auth/transport modules.
- **Respect sync invariants.** Entity changes and queued intent commit together.
  Retry immutable operations; clear only after acknowledgement. Preserve account
  isolation, tombstones, pending work and explicit conflict review.
- **Preserve unit meaning.** Existing weight values use active settings units.
  No historical per-record unit data is available. Do not guess kilograms or perform
  a silent global conversion.
- **Never equate queueing with delivery.** Automatic merge skips/report differing
  IDs and preserves account preferences and original local data. App-open online
  foreground sync is supported; app-closed background delivery is not promised.

## Testing seam

The main UI seam is a page rendered with `RepositoryProvider` supplying a fake
`WorkoutRepository` and a `MemoryRouter`. Assert visible records, links, controls
and outcomes through accessible queries. Existing Dashboard/Analytics/Workout page
tests demonstrate the pattern; do not add a second UI data-access abstraction.

Use narrow pure-function tests for BMI boundaries, aliases, set loads, date ranges
and other calculations. Persistence tests must prove transaction/backup/snapshot
behavior using fake IndexedDB. Coordinator tests simulate retries and conflicts;
SQL tests prove RPC authorization, atomicity and isolation. Playwright tests use the
production build for real browser/offline/mobile behavior.

These are complementary boundary checks. Do not write tests that merely repeat
implementation internals or claim mocks prove hosted OAuth/cross-device delivery.

## Validation and completion

Run the checks appropriate to the touched boundary:

```sh
npm run lint
npm run typecheck
npm test
npm run build
# For UI/PWA changes:
npm run test:e2e
# For SQL/sync contract changes, with local Supabase running:
npm run test:db
```

The root TypeScript config uses references: plain `tsc --noEmit` does not establish
type safety. Use the scripts above. Do not repeatedly rerun unchanged checks after
they pass without a new failure, change or unresolved concern.

For documentation-only changes, check links, commands and claims against source and
workflow files; do not invent test evidence or rerun application tests to validate prose.

Before finishing, review the diff, update AGENTS.md/current feature docs, and record
remaining limitations. Publishing/deployment must be distinguished from a local
commit. Keep paid infrastructure and destructive data operations outside routine
implementation.

## Frequent regressions

- Untyped/unspecified legacy exercise names disappearing from category graphs.
- Showing only one exercise instead of every exercise within a category.
- Treating warm-ups or active sessions as completed working-set history.
- Losing seconds stored in the reps field when formatting timed sets.
- Reusing stale async pre-fill values when switching exercises in the same session.
- Accessible chart tables widening the mobile document: wrap tables in an sr-only
  div; the table itself must not control outer layout width.
- Scrolling the desktop outer frame instead of its positioned inner content pane.
- Reimporting a deleted cloud record from retained original local history.
- Applying delayed responses from an old account scope to the newly active account.
- Advertising hosted OAuth, iOS installation or real migration reconciliation on the
  strength of mocked auth, local SQL or Chromium-only tests.
