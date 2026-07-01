# Progression

A local-first workout tracker PWA. It answers two questions well — **what should I train today?** and **what did I actually lift?** — without a backend, a login, or progression "intelligence" getting in the way.

All data lives on your device in IndexedDB. Nothing is sent anywhere; there is no account and no sync.

## Features

- **Today** — a Push/Pull/Legs program that suggests the next session based on what you last completed, with upcoming days at a glance.
- **Workout logging** — big, thumb-friendly weight/rep steppers, last-performed hints per exercise, and a green flash when a set saves.
- **Activity** — a month calendar with current/best streaks, plus manual run logging (distance + time) with derived pace and speed. Both completed lifts and runs count as active days toward a weekly goal.
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
  pages/        route screens (Dashboard, Workout, Activity, History, Plans, Settings, …)
  components/   UI primitives + shared widgets (AppShell, Stepper, Calendar, RunForm, …)
  storage/      repository interface + Dexie implementation + HTTP skeleton
  hooks/        useObservable, useSettings
  utils/        pure helpers (program derivation, streak math, run metrics)
  types/        shared domain types
```

## Getting started

```bash
npm install
npm run dev      # start the dev server
```

Then open the printed local URL. On first launch a one-screen onboarding asks for your name; everything else is ready to go.

## Scripts

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server                           |
| `npm run build`   | `tsc -b` (authoritative typecheck) + `vite build`   |
| `npm run preview` | Preview the production build locally                |

> The root `tsconfig` uses project references, so `tsc --noEmit` is a no-op — use
> `npm run build` for a real typecheck.

## Data & privacy

Everything stays in your browser's IndexedDB on this device. Use **Settings → Export
backup** to save a JSON snapshot, and **Import backup** to restore it (which replaces all
current data). Clearing site data or uninstalling the PWA removes your history, so keep a
backup if it matters.
