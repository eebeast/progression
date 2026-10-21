# CLAUDE.md

See [AGENTS.md](./AGENTS.md) for the full project context, architecture, conventions,
build/verify commands, and gotchas. That file is the single source of truth for agents
working in this repo — keep it updated when features or conventions change.

## Quick reminders

- **Recorded facts by default** — no 1RM estimates, new goals or trend advice.
  Adult BMI is the explicitly approved exception: use saved measurements and CDC
  adult screening ranges, with muscle-mass/diagnosis limitations.
- Read the [current PRD](docs/product-requirements.md), [agent guide](docs/agent-development.md)
  and [open tasks](docs/todo.md). Removed historical prompts remain in Git history.
- **Never import `dexie` outside `src/storage/dexie/`.** Go through the `WorkoutRepository`
  interface; a new method means editing the interface + `DexieRepository` + `HttpRepository`.
- **New Dexie store → `version(N)` bump; new field on an existing record → no bump** (read
  defensively).
- **Typecheck with `npx tsc -b` / `npm run build`** — `tsc --noEmit` is a no-op here.
