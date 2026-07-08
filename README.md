# Progression

A local-first workout tracker PWA. It answers two questions well — **what should I train today?** and **what did I actually lift?** — without a backend, a login, or progression "intelligence" getting in the way.

All data lives on your device in IndexedDB. Nothing is sent anywhere; there is no account and no sync.

> **Design principle:** Progression only ever **records and recalls facts.** No
> 1RM formulas, no goal tracking, no BMI, no trend/percentage callouts, no
> "intelligence." Everything below is a plain log or a directly-derived fact.

## Features

- **Today** — a Push/Pull/Legs program that suggests the next session based on what you last completed, with upcoming days at a glance. Reorder the queue with the up/down arrows (e.g. swap today and tomorrow) — it persists as your program order.
- **Workout logging** — big, thumb-friendly weight/rep steppers, last-performed hints per exercise, and a green flash when a set saves. Sets are **drag-to-reorder**, and per-exercise **time-based** logging (seconds) is supported alongside reps.
- **Warm-up sets** — tag a set as a warm-up with the toggle chip; it renders muted with a "W" badge and is excluded from targets, the progress bar, and personal records, but still recorded.
- **Personal records** — the best lift on file per exercise (heaviest weight ever, and most reps at that weight), shown as `Best: …` on the Workout screen and the exercise page, with a `🏆 New PR` badge when a set beats the prior record. Derived live, never stored.
- **Exercise history** — tap any exercise name to drill into `/exercise/:id`: its current record on top, then every session that logged it, most recent first.
- **Share** — a Share button on the Summary and History-detail pages builds a plain-text recap (native share sheet on mobile, clipboard elsewhere).
- **Activity** — a month calendar with current/best streaks, manual run logging (distance + time) with derived pace/speed, and a **body-weight log** (date + weight, editable list). Completed lifts and runs count as active days toward a weekly goal.
- **History** — every finished session, tappable for the full set-by-set detail.
- **Plans** — edit the built-in templates or build your own.
- **Settings** — name, light/dark/system theme, accent presets (blue / purple / orange / green), weight increment, weekly goal, and full JSON export/import backup.
- **PWA** — installable and works offline.

## Tech stack

- **React 18 + TypeScript + Vite 5**
- **Tailwind CSS 3** with CSS-variable + `color-mix` design tokens (an Apple-derived palette, WCAG AA)
- **Dexie 4 / IndexedDB** for storage, exposed reactively via `liveQuery`
- **React Router 6**, **lucide-react** icons
- **vite-plugin-pwa** for the installable/offline shell

## Architecture

The UI never touches Dexie directly. All persistence sits behind a single
`WorkoutRepository` interface (`src/storage/repository.ts`):

- **Reactive reads** return a minimal, backend-neutral `Observable<T>` (Dexie's
  `liveQuery` is structurally compatible), consumed by the `useObservable` hook.
- **Writes** return `Promise`s.
- The concrete `DexieRepository` (`src/storage/dexie/`) is the only code that imports
  `dexie`. An `HttpRepository` skeleton (`src/storage/http/`) proves the seam: swapping
  storage for a real backend means implementing that interface, with no changes to pages
  or components.

The repository is provided via React context (`RepositoryProvider`), so components pull
it through `useRepo()`.

```
src/
  pages/        route screens (Dashboard, Workout, Summary, Activity, History,
                HistoryDetail, ExerciseHistory, Templates, Settings, Onboarding)
  components/   UI primitives + shared widgets (AppShell, Stepper, SetList/SetRow,
                WarmupToggle, ShareButton, Calendar, RunForm, BodyWeightSection, …)
  storage/      repository interface + Dexie implementation + HTTP skeleton
  hooks/        useObservable, useSettings
  utils/        pure helpers (program, streak math, run metrics, personalRecords,
                shareSummary, format)
  types/        shared domain types
```

### Dexie schema versions

The IndexedDB store is versioned additively (`src/storage/dexie/DexieRepository.ts`):

- **v1** — `settings`, `exercises`, `templates`, `sessions`, `logs`
- **v2** — adds `runs`
- **v3** — adds `bodyWeights`

Adding a **new store** requires a `this.version(N).stores({...})` bump. Adding a new
**field** to an existing record (e.g. `ExerciseLog.isWarmup`, `ExerciseLog.metric`) is
back-compat and needs **no** version bump — read it defensively (`?? default`).

## Getting started

```bash
npm install
npm run dev      # start the dev server
```

Then open the printed local URL. On first launch a one-screen onboarding asks for your name; everything else is ready to go.

## Scripts

| Command              | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server                           |
| `npm run build`      | `tsc -b` (authoritative typecheck) + `vite build`   |
| `npm run typecheck`  | `tsc -b` — real typecheck without bundling          |
| `npm run lint`       | ESLint over the project                             |
| `npm test`           | Run the Vitest unit suite once                      |
| `npm run test:watch` | Vitest in watch mode                                |
| `npm run preview`    | Preview the production build locally                |

> The root `tsconfig` uses project references, so `tsc --noEmit` is a no-op — use
> `npm run typecheck` (`tsc -b`) or `npm run build` for a real typecheck.

## Testing & CI

Pure-logic helpers are unit-tested with **Vitest** (`src/utils/*.test.ts`) — personal
records, program/rotation derivation, the share recap, formatting, and streaks. Run
`npm test`.

GitHub Actions (`.github/workflows/ci.yml`) runs lint → typecheck → test → build on every
push and pull request to `main`.

## Data & privacy

Everything stays in your browser's IndexedDB on this device. Use **Settings → Export
backup** to save a JSON snapshot, and **Import backup** to restore it (which replaces all
current data). Clearing site data or uninstalling the PWA removes your history, so keep a
backup if it matters.
