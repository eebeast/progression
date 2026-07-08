# AGENTS.md

Context for AI agents (and humans) working in this repo. Keep this file current when
you add features or change conventions.

## What this is

**Progression** — a local-first workout tracker PWA. React 18 + TypeScript + Vite 5,
Tailwind 3, Dexie 4 / IndexedDB, React Router 6, lucide-react, vite-plugin-pwa.
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

## Feature map

- **Warm-up sets** — `ExerciseLog.isWarmup`; `components/WarmupToggle.tsx`; filtered out
  of targets/progress/PRs in `pages/Workout.tsx` and rendered muted with a "W" in
  `SetRow`/`HistoryDetail`/`ExerciseHistory`.
- **Personal records** — `utils/personalRecords.ts` (`getRecord`, `getRecordSetIds`,
  warm-ups excluded, derived live — never persisted). Surfaced in `Workout` ("Best" +
  `🏆 New PR` badge) and `ExerciseHistory`. Backed by `observeExerciseLogs(exerciseId)`.
- **Exercise history** — route `/exercise/:exerciseId` → `pages/ExerciseHistory.tsx`.
  Entry points: exercise title in `Workout`, group headings in `HistoryDetail`.
- **Share** — `utils/shareSummary.ts` (`buildWorkoutRecap`, working sets only) +
  `components/ShareButton.tsx` (`navigator.share`, else clipboard). Used in `Summary`
  and `HistoryDetail`.
- **Body-weight log** — `bodyWeights` store + `observe/add/update/deleteBodyWeight`;
  `components/BodyWeightSection.tsx` on the Activity page.
- **Time/reps metric & drag-reorder** — `ExerciseLog.metric`, `utils/format.ts`
  `formatSetValue`; `components/SetList.tsx` (pointer drag → `reorderSets(ids)`) wrapping
  `SetRow`.
- **Reorder rotation** — Dashboard "Up next" up/down arrows reorder the program via
  `reorderTemplates(orderedIds)` (sets each `order` to its array index). Today/upcoming are
  derived in `utils/program.ts` (`deriveTodayTemplate`, `getRotation`, `getUpcoming`) from
  template `order`, anchored to the last-completed template. `moveDay` in `Dashboard.tsx`
  persists `[anchor, ...reorderedRotation]` so the anchor stays pinned and the derivation
  reproduces the new sequence.

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

**Tests:** pure-logic helpers are unit-tested with **Vitest**, colocated as
`src/utils/*.test.ts` (Node environment, no DOM). When you touch a pure util
(`personalRecords`, `program`, `shareSummary`, `format`, `activity`, `runMetrics`), add or
update its test. Component/DOM tests aren't set up yet — add `jsdom` + RTL if needed.

**CI:** `.github/workflows/ci.yml` runs lint → typecheck → test → build on every push/PR to
`main`. Keep all four green.

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
