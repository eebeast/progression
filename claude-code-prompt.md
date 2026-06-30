# Build prompt for Claude Code — Personal Workout Tracker

> Paste everything below the line into Claude Code. It's written as a direct
> instruction to the agent: scaffold the project, install deps, implement it,
> typecheck/build, run the dev server, and fix until it's clean.

---

Build me a personal workout tracker as a real, runnable web app. Scaffold it in
the current directory, install dependencies, implement everything below, then
run `tsc` and `npm run build` and fix any errors until both pass. Finish by
starting the dev server so I can open it.

## What this is (and what it is NOT)

This is a **personal** tool for me and one or two friends. It is **not** a
startup, not a product, and not a competitor to Strong or Hevy. Optimize for
calm, speed, and simplicity — think Apple Notes' plainness, Linear's cleanliness,
Hevy's logging flow, with zero bloat.

It exists to answer exactly two questions:
1. **What workout am I doing today?**
2. **What did I lift today?**

Resist scope creep aggressively. Every screen should feel quiet and fast.

### Do NOT build
- No login, accounts, profiles, or onboarding beyond a one-screen name/units setup.
- No social, sharing, feeds, or friends features.
- No backend, server, cloud sync, or auth. **All data is local (IndexedDB).**
- No charts, graphs, or analytics dashboards.

### Do NOT calculate or infer
- No progression suggestions, 1RM estimates, volume math, or "recommended weights".
- No AI coaching, calories, or anything predictive.
- The app records and recalls. It does not advise.

## Tech stack (use recent stable versions)
- React + TypeScript + Vite
- Tailwind CSS
- shadcn/ui style components (see design note below)
- Dexie (IndexedDB wrapper) + `dexie-react-hooks` (`useLiveQuery` for reactivity)
- React Router
- `vite-plugin-pwa` so it's installable / works offline
- `lucide-react` for icons

Set up a `@/*` path alias to `./src/*` in both `vite.config.ts` and `tsconfig.json`.
TypeScript `strict: true`, but `noUnusedLocals`/`noUnusedParameters` can be off.

## Folder structure

```
src/
  components/
    ui/                shadcn-style primitives: button, card, input, label,
                       textarea, progress
    AppShell.tsx       centered max-w-md column + bottom tab nav
    PageHeader.tsx     sticky header with left/title/right slots
    Stepper.tsx        big -/+ numeric stepper with direct entry
    RestTimer.tsx      dumb countdown bar
    SetRow.tsx         a logged set; tap to edit inline
    FeelingPicker.tsx  3 faces; also exports EmptyState
  pages/
    Dashboard, Workout, Summary, History, HistoryDetail,
    Templates, TemplateEditor, Settings, Onboarding
  storage/
    db.ts              Dexie schema
    seed.ts            first-run defaults (Push/Pull/Legs)
    queries.ts         session lifecycle, set logging, last-workout lookup
    backup.ts          JSON export / import
  hooks/useSettings.ts
  types/index.ts
  utils/format.ts      ids + duration/date/greeting/clock formatting
  lib/utils.ts         cn() class helper
```

## Data models

```ts
type Unit = 'kg' | 'lb';
type Theme = 'light' | 'dark' | 'system';
type Feeling = 'good' | 'ok' | 'rough';
type SessionStatus = 'active' | 'completed';

interface Settings {            // single row, id = 'singleton'
  id: 'singleton';
  userName: string;
  unit: Unit;
  theme: Theme;
  restTimerEnabled: boolean;
  defaultRestSeconds: number;   // e.g. 90
  weightIncrement: number;      // e.g. 2.5
}

interface Exercise {            // GLOBAL library, reused across templates
  id: string; name: string; createdAt: number;
}

interface TemplateExercise {    // an exercise as configured inside a template
  exerciseId: string; name: string;   // name cached for display/editing
  targetSets: number; targetRepRange: string; order: number;
}

interface WorkoutTemplate {
  id: string; name: string;
  order: number;                // program order -> powers "Today / Upcoming"
  estimatedMinutes: number;     // hard-coded field, shown on the dashboard
  exercises: TemplateExercise[];
  createdAt: number; updatedAt: number;
}

interface WorkoutSession {
  id: string; templateId: string;
  templateName: string;         // DENORMALIZED snapshot
  date: number;                 // start timestamp; also the calendar date
  startTime: number; endTime: number | null;   // duration is DERIVED, never stored
  notes: string; feeling: Feeling | null;
  status: SessionStatus;
}

interface ExerciseLog {
  id: string; sessionId: string;
  exerciseId: string; exerciseName: string;    // DENORMALIZED snapshot
  setNumber: number; weight: number; reps: number; timestamp: number;
}
```

### Dexie schema
```ts
this.version(1).stores({
  settings: 'id',
  exercises: 'id, name',
  templates: 'id, order',
  sessions: 'id, date, status, templateId',
  logs: 'id, sessionId, exerciseId, [sessionId+exerciseId], timestamp',
});
```

### Modeling rules (important)
- **Exercises are a global library.** Templates reference them by `exerciseId`.
  This is what makes "last workout" lookups work across sessions.
- **Denormalize names at write time.** Sessions snapshot `templateName`; logs
  snapshot `exerciseName`. A log is a permanent record, not a live join — history
  must stay correct even if a template/exercise is later renamed or deleted.
- **Duration is always derived** from `startTime`/`endTime`. Persist the active
  session immediately (`status: 'active'`) so a workout survives the app being
  backgrounded — the dashboard can then offer "Resume".

## Screens & flows

### Onboarding (first run only)
If the settings row has an empty `userName`, show a single calm screen: name
field + kg/lb choice + "Get started". Save and proceed. Nothing else.

### Dashboard
- Time-based greeting ("Good morning, {name}") and a settings gear.
- **Today's workout** is derived: the next template (by `order`) after the last
  *completed* session; if none completed, the first template. Show name,
  estimated minutes, exercise count, and a big **Start workout** button.
- If a session is already active, replace the start card with a **Resume workout**
  card (and a quiet "Discard workout" with confirm).
- A collapsible "Start a different workout" picker listing all templates.
- **Upcoming**: Tomorrow / Next, derived from the same program order.

### Workout — the centerpiece (make this loop feel ~5 seconds per set)
Single exercise on screen at a time.
- Sticky header: back, template name, "Exercise i of N", a **Finish** action, and
  a workout-level progress bar (completed sets / total target sets).
- Body: prev/next exercise chevrons + a **Skip** action; the exercise name;
  "{targetSets} sets · {repRange} reps" with a green "target met" chip once hit.
- A **Last workout** panel showing that exercise's sets from the most recent
  *other* session (e.g. `60kg × 8`, `60kg × 8`, `57.5kg × 7`), or "First time".
- The logged sets for this exercise this session, each as a `SetRow` you can tap
  to **edit weight/reps inline or delete**.
- Set entry: two big **Steppers** — Weight (step = `weightIncrement`,
  `inputMode="decimal"`) and Reps (step 1, autofocus). **Pre-fill weight** from
  the last set this session, else the last-workout weight.
- Sticky footer:
  - If the exercise hasn't been started and has no sets → a single
    **Start exercise** button.
  - Once started → **Save set** (primary; disabled until reps > 0) which logs the
    set, keeps the weight pre-filled, clears reps, and auto-starts the rest timer
    (if enabled). Below it, a secondary **Next exercise** (or **Finish workout**
    on the last one).
- No confirmation dialogs anywhere in this flow. One tap to save.

### Summary
On arrival, freeze the clock (set `endTime` if null). Show duration, exercises
completed, total sets, a 3-face **feeling** picker, an optional **notes** field,
and **Finish** → mark the session completed and return to the dashboard.

### History + detail
- History: completed sessions, newest first — date, template name, duration,
  feeling emoji. Friendly empty state when there are none.
- Detail: session header (date, duration, feeling, notes) then sets grouped by
  exercise (`weight × reps` lines), plus a delete-workout action (with confirm).

### Templates + editor
- List templates by order with exercise count and estimated minutes; "New".
- Editor: name, estimated minutes (stepper), and exercise rows (name input, sets
  stepper, rep-range input, move up/down, remove, add). On save, map each row's
  name to the global exercise library (case-insensitive match, create if missing),
  assign `order`, and write the template. Delete-template action (with confirm).

### Settings
Name, units (kg/lb), theme (light/dark/system), rest-timer toggle + default
seconds, weight increment (1 / 2.5 / 5), and **Export backup** / **Import backup**
(JSON). Import replaces all data after a confirm.

## The agreed enhancements (all of these are in scope)
These fix real friction without adding "intelligence":
1. **Rest timer** — a dumb optional countdown that auto-starts on save; ±15s and skip.
2. **JSON backup** — one-tap export/import in Settings (still no backend).
3. **Installable PWA** — manifest + icons; "Add to Home Screen" works.
4. **Editable sets** — tap any logged set to correct a mis-tap.
5. **Mid-workout flexibility** — add extra sets, skip an exercise, finish early.
6. **Weight steppers with pre-fill** — never a bare number field.
7. **Honest "Upcoming"** — derived from real template order, not faked.
8. **Estimated time** — a concrete field per template.
9. **Model fixes** — notes + feeling; derived duration; per-user unit; global
   exercise library.
10. **First-run + empty states** — short onboarding and friendly empties.

## Design system

Calm, minimal, Linear-clean. Mobile-first; everything must work one-handed on a
phone and stay centered (`max-w-md`) on desktop. Build to a quality floor:
responsive, visible keyboard focus, `prefers-reduced-motion` respected.

**Tokens as CSS variables (full light + dark theme).** Map Tailwind semantic
colors to the variables so utilities like `bg-primary`, `text-muted-foreground`,
`border-border` work. Make the tokens alpha-aware so `/opacity` modifiers work
even though the variables hold hex (e.g. wrap each as
`color-mix(in srgb, var(--x) calc(<alpha-value> * 100%), transparent)`).

Light theme:
```
--background:#FAFAFA  --foreground:#111827
--card:#FFFFFF        --muted:#F3F4F6  --muted-foreground:#6B7280
--primary:#2563EB     --success:#16A34A  --destructive:#DC2626
--border:#E5E7EB      --input:#E5E7EB    --ring:#2563EB    --radius:0.75rem
```
Provide a comfortable dark theme (deep slate background, lighter text, slightly
brighter primary/success). Theme is applied by toggling a `dark` class on
`<html>` from the `theme` setting, honoring `system` via `matchMedia`.

- **Type**: Inter. Use **tabular figures** (`tabular-nums`) on all weights, reps,
  timers, and durations so numbers don't jitter.
- **Touch targets**: primary buttons 56–64px tall; stepper +/- buttons ~56px;
  everything tappable ≥44px; keep primary actions bottom-reachable.
- **Surfaces over shadows**: lean on the card/border tokens and `rounded-xl`,
  generous whitespace, restraint.
- **One signature micro-interaction only**: a brief green flash on a set row the
  instant it's saved. Nothing else animated beyond subtle fades.
- Inputs render at ≥16px to avoid iOS zoom; set viewport `viewport-fit=cover`.

### shadcn note
Either run the shadcn CLI to add the primitives, or hand-write minimal
shadcn-style components into `src/components/ui`. Because the CSS variables hold
hex (not shadcn's HSL triplets), if you use the CLI, adjust generated components
that use `hsl(var(--x))` to `var(--x)` (or `color-mix`). Hand-writing the six
primitives I listed is perfectly fine and keeps setup zero-config.

## Seed data (first run)
Create default settings (kg, system theme, rest 90s, increment 2.5, empty name)
and a **Push / Pull / Legs** program with sensible exercises, target sets, and
rep ranges (e.g. Push: Bench, Incline DB Press, OHP, Lateral Raise, Skullcrusher,
Triceps Pushdown). Seeding must be idempotent — only write when a table is empty.

## Implementation notes / decisions
- Use `useLiveQuery` so screens react to DB writes automatically.
- Generate ids with `crypto.randomUUID()` and a fallback for non-secure contexts.
- Switching kg↔lb relabels and changes the stepper increment; do **not**
  retroactively convert stored numbers (intentionally simple).
- "Today's workout" is purely the next template after the last completed session
  — no calendar or scheduling.

## Workflow (do this, in order)
1. Scaffold the Vite React-TS project and install all dependencies.
2. Implement the structure, storage layer, components, and pages above.
3. Generate simple PWA icons (a blue rounded square with a barbell glyph is fine)
   and wire up `vite-plugin-pwa`.
4. Run `npx tsc --noEmit` and `npm run build`; fix every error until both pass.
5. Start the dev server and tell me the URL. Summarize what you built, any
   assumptions, and how to test the core logging loop on a phone.
