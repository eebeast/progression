# Progression Vert implementation status

This checklist tracks the work in
[`progression-vert-implementation-plan.md`](./progression-vert-implementation-plan.md).
Backend evaluation and storage decision requirements are detailed in
[`progression-vert-storage-decisions.md`](./progression-vert-storage-decisions.md).
Status reflects the implementation in this repository as of October 17, 2026.

Supabase and Google sign-in are now confirmed. Follow
[`supabase-implementation-plan.md`](./supabase-implementation-plan.md) for execution
stages, acceptance tests, setup and rollout. Implementation of those stages is pending.
Installable PWA delivery is explicit in that plan: existing manifest/service-worker
support will gain install guidance, safe update prompts and real-device offline checks.

## Status summary

- [x] **Task 1 — Audit the existing application:** Identified the React/Vite app, Dexie/IndexedDB repository seam, routes, local persistence, backup handling, and dependencies. A complete file-level architecture report and verification against the actual legacy export remain part of migration validation.
- [ ] **Task 2 — Define canonical models and migration** *(in progress)*: Added a v1 legacy-backup parser that checks the backup shape and IDs, reports record counts, duplicate exercise names, malformed timestamps and unresolved references, and preserves original records without automatic merges. Settings now shows counts and warnings before replacing data. Tests cover backup parsing and validation. Still needed: inspect the real backup, reconcile all IDs and relationships, and test actual IndexedDB import/re-import and recovery.
- [ ] **Task 3 — Refactor persistence behind repositories:** Keep all UI persistence behind `WorkoutRepository`; add/verify versioned local schema migration, preserve current functionality and backup handling, and add repository transaction/persistence tests.
- [ ] **Task 4 — Implement authentication and cloud storage:** Supabase free plan and Google sign-in selected. Implement schema migrations, authorization/ownership policies, account setup and isolation tests. Hosted infrastructure is not configured yet.
- [ ] **Task 5 — Build offline sync:** Implement the persistent outbox, stable operation/entity IDs, idempotent writes, acknowledgements, retries, pull cursors, tombstones, conflict handling, account partitioning and visible sync status. Verify offline restart/reconnect, concurrent edits and account switching.
- [ ] **Task 6 — Build reusable exercise and plan management:** Use canonical exercise IDs across plans, support custom exercises, plan-specific prescriptions, duplicate warnings, explicit validated merges and archive semantics that preserve history.
- [ ] **Task 7 — Improve phone workout logging:** Add planned exercise preloading, faster set entry, previous-session values, rest timer, undo and offline run/body-weight logging with sync status.
- [ ] **Task 8 — Build dashboard and analytics:** Add shared tested gym/running calculations and weekly/monthly/custom summaries, exercise progression, muscle-group volume, running metrics and body-weight views. Follow the repository's facts-only principle: do not implement estimates, goals, trends or advice without an explicit product-principle change.
- [ ] **Task 9 — Verify, migrate and release:** Complete migration reconciliation, sync and account-isolation tests, analytics verification, responsive checks, and recovery/rollback documentation before cutover or removal of legacy storage.

## Implementation notes

- Local-foundation follow-up: new sessions snapshot plan exercises; set numbering is
  allocated transactionally; exports use a consistent read transaction; seeding with
  an existing exercise library now retains valid references. Repository tests cover
  re-import, rollback, snapshots, concurrent writes and seed integrity. Workout page
  regression tests cover snapshots and legacy fallback.
- See `current-storage-audit.md` and `storage-architecture-decision.md` for the audit,
  provider comparison and remaining rollout gates. Google sign-in is the user's
  preference; Supabase is selected and provider integration is pending implementation.

- No new repository was needed; work is in the existing application.
- Supabase free plan is selected; paid infrastructure is not authorized. No hosted project is configured yet.
- The migration parser and Settings confirmation are implemented in `src/storage/legacyBackup.ts`, `src/storage/dexie/DexieRepository.ts`, and `src/pages/Settings.tsx`.
- Verification performed for the implemented migration-inspection slice: TypeScript check, production build, full 94-test suite before the final focused test was added, and all 5 focused migration tests. Lint completed with warnings, including pre-existing repository warnings.
