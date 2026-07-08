# CLAUDE.md

See [AGENTS.md](./AGENTS.md) for the full project context, architecture, conventions,
build/verify commands, and gotchas. That file is the single source of truth for agents
working in this repo — keep it updated when features or conventions change.

## Quick reminders

- **Facts only** — no calculated advice/estimates (no 1RM, goals, BMI, trends).
- **Never import `dexie` outside `src/storage/dexie/`.** Go through the `WorkoutRepository`
  interface; a new method means editing the interface + `DexieRepository` + `HttpRepository`.
- **New Dexie store → `version(N)` bump; new field on an existing record → no bump** (read
  defensively).
- **Typecheck with `npx tsc -b` / `npm run build`** — `tsc --noEmit` is a no-op here.
