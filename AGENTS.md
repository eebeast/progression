# AGENTS.md

Context for AI agents (and humans) working in this repo. Keep this file current when
you add features or change conventions.

## What this is

**Progression** — a local-first workout tracker PWA. React 18 + TypeScript + Vite 5,
Tailwind 3, Dexie 4 / IndexedDB, React Router 6, lucide-react, recharts, vite-plugin-pwa.
No backend, no auth, no network — all data lives in the browser's IndexedDB.

## Non-negotiable design principle

**The app only records and recalls facts.** Do **not** add calculated advice or
estimates: no 1RM formulas, no goal tracking, no BMI, no trend/percentage callouts, no
progression "intelligence." Features either store something the user entered or show a
value directly derived from stored data (e.g. "heaviest weight ever logged"). When in
doubt, prefer a plain log over a computed suggestion.

## Architecture — the repository seam

The UI **never** touches Dexie directly. All persistence is behind one interface,
`WorkoutRepository` (`src/storage/repository.ts`):

- **Reactive reads** return a backend-neutral `Observable<T>` (Dexie's `liveQuery` is
  structurally compatible), consumed by the `useObservable(factory, deps)` hook.
- **Writes** return `Promise`s.
- `DexieRepository` (`src/storage/dexie/DexieRepository.ts`) is the **only** file that
  imports `dexie`. `HttpRepository` (`src/storage/http/`) is a non-functional stub that
  proves the seam — every interface method has a `TODO()` stub there.
- Components get the repo via `useRepo()` (`RepositoryProvider`).

**Adding a repository method = edit three files in lockstep:** the interface
(`repository.ts`), the Dexie implementation, and the Http stub. If they drift, `tsc`
fails because both classes `implements WorkoutRepository`.

## Data model & Dexie versioning

Types live in `src/types/index.ts`. Stores are versioned additively in
`DexieRepository`:

- **v1** `settings, exercises, templates, sessions, logs` · **v2** `runs` · **v3** `bodyWeights`
  · **v4** `outbox, versions, syncMeta, syncConflicts`

Account repositories use a project/account-specific database. Account mutations and
their immutable outbox groups commit in one transaction; remote changes bypass that
queue. Version 2 recovery exports include sync state; normal imports never replay a
foreign outbox. Account imports merge by ID and reject collisions; local-only imports
retain the confirmed replacement behavior. Keep this distinction visible in Settings.

Rules:
- **New store** → new `this.version(N).stores({...})` bump (follow the `runs`/`bodyWeights`
  pattern; existing stores carry over untouched). Also wire it into `exportData`/
  `importData` and the `BackupShape`.
- **New field on an existing record** (e.g. `ExerciseLog.isWarmup`, `ExerciseLog.metric`)
  → back-compat, **no** version bump. Read defensively (`x.metric ?? 'reps'`,
  `!!x.isWarmup`).

Key record shapes: `ExerciseLog` (a logged set: `weight`, `reps` [= seconds when
`metric === 'time'`], `metric?`, `isWarmup?`, `setNumber`, `timestamp`),
`WorkoutSession`, `WorkoutTemplate`/`TemplateExercise` (has `metric?`), `Run`,
`BodyWeightEntry`.

New sessions snapshot ordered plan assignments in `WorkoutSession.exercises` at start.
`Workout` uses that snapshot, including an intentionally empty list; legacy sessions
without it fall back to their current template. Never backfill historical prescriptions
from a plan that may have changed. This optional field requires no schema bump.
Repository tests use `fake-indexeddb` and cover import/export, rollback, seeding,
concurrent set numbering, and session snapshots.

## Feature map

- **Warm-up sets** — `ExerciseLog.isWarmup`; `components/WarmupToggle.tsx`; filtered out
  of targets/progress/PRs in `pages/Workout.tsx` and rendered muted with a "W" in
  `SetRow`/`HistoryDetail`/`ExerciseHistory`.
- **Personal records** — `utils/personalRecords.ts` (`getRecord`, `getRecordSetIds`,
  warm-ups excluded, derived live — never persisted). Surfaced in `Workout` ("Best" +
  `🏆 New PR` badge) and `ExerciseHistory`. Backed by `observeExerciseLogs(exerciseId)`.
- **Exercise top sets** — route `/exercise/:exerciseId` → `pages/ExerciseHistory.tsx`: the
  PR (`getRecord`) plus the best 4 dated sets (`getTopSets` in `utils/personalRecords.ts`,
  dedup by weight×reps keeping the most recent date). Entry points: exercise title in
  `Workout`, group headings in `HistoryDetail`, and — when `settings.showExerciseLibrary`
  is on — an "Exercises" nav tab (`AppShell`) → `/exercises` (`pages/Exercises.tsx`).
- **Exercise progress chart** — on `ExerciseHistory` below the PR:
  `components/ExerciseProgressChart.tsx` (recharts `LineChart`, ~180px, `var(--primary)`
  line/dots, no gridlines/legend), fed by `getSessionProgress(logs, dateBySession)` in
  `utils/personalRecords.ts` — one point per completed session (warm-ups excluded,
  only-warmup sessions skipped), chronological. A pill toggle switches the y metric
  between top-set weight and working-set count. Facts only: **no** trend/projection/average;
  renders "Not enough data yet" below 2 sessions. Recharts 3.x: type a custom Tooltip
  `content` fn as `TooltipContentProps` with default generics or `tsc -b` rejects it.
- **Dashboard and Logbook** — `/activity` shows charts and a combined streak/calendar
  card. `/history` (Logbook) owns exercise/run/body-weight records and type filters,
  including an empty Cycles filter until cycling logging exists. Calendar dates link
  to `/history?date=YYYY-MM-DD`. `/analytics` redirects to Dashboard. See
  `docs/activity-overview.md`. Categories are Chest/Legs/Back/Core/Arms/Compound;
  `Exercise.category?` wins over legacy labels/configured names. New exercise UI
  requires a category. No Unspecified category is displayed. Workout activity has
  week/month/year/custom ranges; category load and individual set-load graphs use
  all completed history independently of date controls and gym filters. Category
  details show the full configured catalog, custom exercises and legacy records.
  Recognized legacy spelling aliases never merge IDs. Warm-ups are excluded.
  Streaks default to calendar weeks and derive current/best counts from completed
  workouts and runs. Keep chart values factual, accessible and in active units.
- **Share** — `utils/shareSummary.ts` (`buildWorkoutRecap`, working sets only) +
  `components/ShareButton.tsx` (`navigator.share`, else clipboard). Used in `Summary`
  and `HistoryDetail`.
- **Backup migration inspection** — `storage/legacyBackup.ts` validates v1 backup
  containers and IDs, reports suspicious timestamps and unresolved references without
  rewriting source records, and feeds the Settings import confirmation before replacement.
- **Body-weight log** — `bodyWeights` store + `observe/add/update/deleteBodyWeight`;
  new entries use `TodayEntries` on Today; `BodyWeightRow` in Logbook retains
  edit/delete controls. Dashboard displays body weight only as a chart. `RunForm` and `BodyWeightForm` await
  persistence, prevent repeated saves and retain failed drafts.
- **Time/reps metric & drag-reorder** — `ExerciseLog.metric`, `utils/format.ts`
  `formatSetValue`; `components/SetList.tsx` (pointer drag → `reorderSets(ids)`) wrapping
  `SetRow`.
- **Reorder rotation** — the Dashboard "Up next" list is the single place to both **start
  any day** (tap a row) and **reorder** it (up/down arrows), replacing the old "Start a
  different workout" picker. Rows = `getRotation(...)` (non-anchor days, reorderable) plus
  the anchor appended as a startable-only loop-back row. Reorder persists via
  `reorderTemplates(orderedIds)` (each `order` = array index); `moveDay` writes
  `[anchor, ...reorderedRotation]` so the anchor stays pinned and `deriveTodayTemplate`
  reproduces the new sequence. Today/upcoming derive from template `order` in
  `utils/program.ts` (`deriveTodayTemplate`, `getRotation`, `getUpcoming`).

## Routes

`/onboarding`, `/` (Dashboard), `/workout/:sessionId`, `/summary/:sessionId`,
`/activity`, `/history`, `/history/:sessionId`, `/exercise/:exerciseId`, `/templates`,
`/templates/new`, `/templates/:templateId`, `/settings`. Defined in `src/App.tsx`.

## Conventions

- **Units:** weight is stored/displayed in the active `settings.unit` (`kg`/`lb`); there
  is no conversion — a number is shown with whatever unit is current.
- **Steppers:** use `components/Stepper.tsx` (decimal for weight, integer for reps,
  5s step for time, 0.5 for body weight).
- **Editable rows** (sets, runs, body weight) share a pattern: tap to edit inline with a
  Stepper/inputs + Delete/Save; see `SetRow`, `RunRow`, `BodyWeightSection`.
- **Styling:** Tailwind with CSS-variable design tokens; use the `cn()` helper
  (`src/lib/utils.ts`). Warm-up/PR accents use `amber-500`.
- **Derived facts** (records, PR ids) are computed in `useMemo`/pure utils from live
  data — do not persist an `isPR`/record flag, so edits and deletes stay consistent.

## Build / run / verify

```bash
npm install
npm run dev        # Vite dev server
npm run lint       # ESLint (flat config, eslint.config.js)
npm run typecheck  # tsc -b (real typecheck)
npm test           # Vitest unit suite (src/**/*.test.ts)
npm run build      # tsc -b + vite build
```

**Typecheck gotcha:** the root `tsconfig` uses project references, so `tsc --noEmit` is a
**no-op**. Use `npm run typecheck` (`tsc -b`) or `npm run build`.

**Tests:** **Vitest** with **jsdom** + **React Testing Library** (`@testing-library/react`,
`user-event`, `jest-dom`), colocated as `*.test.ts`/`*.test.tsx`. `src/test/setup.ts`
registers jest-dom matchers and RTL cleanup. Two layers:
- **Pure utils** (`personalRecords`, `program`, `shareSummary`, `format`, `activity`,
  `runMetrics`) — input/output + edge cases. When you touch one, add/update its test.
- **Leaf components/hooks** — behavior via accessible queries + `user-event` (`Stepper`,
  `SetRow`, `WarmupToggle`, `FeelingPicker`, `ShareButton`, `useObservable`). Test what the
  user sees/does, not internals; use real components (stub only browser boundaries like
  `navigator.share`/`clipboard`).
- **Container pages** — integration tests with a fake `WorkoutRepository` injected via
  `RepositoryProvider repository={…}` and wrapped in `MemoryRouter`; use `of(value)` from
  `@/storage/repository` for the reactive reads. `Dashboard.test.tsx` is the reference
  pattern. `Workout`, `Activity`, `Summary`, etc. are still uncovered — follow that pattern
  when you touch them.

**Coverage:** `npm run test:coverage` (v8). CI runs it and uploads the `coverage/` report
as an artifact; there is no hard threshold yet (utils are well covered; pages/storage are
not).

**CI:** `.github/workflows/ci.yml` runs lint → typecheck → test (coverage) → build on every
push/PR to `main`. Keep all green.

**Known follow-up:** `buildWorkoutRecap` (`shareSummary.ts`) still renders `weight×reps`
raw — it doesn't use `formatSetValue`, so `time`-metric and zero-weight sets read oddly in
the shared recap. Align it with `SetRow`/`HistoryDetail` when convenient.

## Gotchas learned the hard way

- **Async pre-fill in `Workout.tsx`:** `lastWorkout` is fetched into state
  asynchronously. The pre-fill effect depends on the `lastWorkout` object (not
  `session.id`) and guards on `sets[0].exerciseId === current.exerciseId`, because two
  exercises from the same past session share a `session.id` — keying on it left stale
  values from the previous exercise. Don't regress this.
- **Warm-up filtering** must be applied consistently: targets, the progress bar, PRs, and
  the share recap all exclude `isWarmup` sets; history/exercise views still show them.
- **`metric === 'time'`** stores seconds in the `reps` field; always render set values
  through `formatSetValue(reps, metric)` and gate the weight with `weight > 0`.
- **Body weight is stored in the unit active at entry time** (like lifts) — no rescaling.
