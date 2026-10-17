# Progression Vert — Data Storage and Sync Decisions

## Purpose
This document supplements the implementation plan. **The coding agent must choose the storage technologies and physical data model** after auditing the existing repository. Do not assume Supabase, PostgreSQL, IndexedDB, Firebase, or a specific API framework is required.

## Non-negotiable requirements
- Phone and laptop access the same account and workout history.
- Workout logging works offline and survives browser refresh/restart.
- Automatic synchronization when online, with clear pending/error indicators.
- No lost sets, duplicated workouts, or accidental cross-account data exposure.
- Preserve existing exercises, plans, sessions, sets, runs, body weights, timestamps, and settings.
- Reuse a single canonical exercise across multiple workout plans while allowing custom exercises.
- Provide weekly/monthly gym, muscle-group, exercise, and running dashboards.
- Retain complete import/export and a rollback path.

## Storage options to evaluate (examples, not requirements)

| Layer | Possible approaches | Considerations |
|---|---|---|
| Cloud records | Supabase/PostgreSQL, Firebase Firestore, hosted database + custom API | Price, query model, security, relationships, portability |
| Offline local records | IndexedDB (native/Dexie), offline database libraries, other persistent browser storage | Browser support, transactions, reliability, storage limits |
| Sync | Custom outbox + API, database replication/sync SDK | Idempotency, conflict resolution, deletion, complexity |
| Authentication | Managed auth or existing project authentication | Secure sessions, account separation, recovery |
| Analytics | Client aggregation, backend queries, materialized summaries | Correctness, performance, offline usability |

The agent should compare at least two viable end-to-end architectures and document the chosen option, alternatives rejected, costs, migration risks, and security model. Obtain approval before paid or irreversible infrastructure changes.

## Logical data entities (not prescribed tables)

| Entity | Key requirements |
|---|---|
| Account | Authenticated ownership and settings |
| Exercise | Stable identity, name, equipment, muscle metadata, archive status |
| Training plan | Name, ordered exercise assignments |
| Plan exercise | Canonical exercise reference plus plan-specific sets/reps/rest |
| Workout session | Start/end, status, plan reference, notes, snapshots |
| Performed exercise | Canonical exercise reference and historical name snapshot |
| Performed set | Stable ID, weight, reps, warm-up flag, ordering |
| Run | Date, distance, duration, type, splits if available |
| Body measurement | Date and weight, extensible measurements |
| Sync operation | Operation ID, revision, pending/acknowledged state, deletion marker |

The agent decides whether these map to SQL tables, documents, collections, or other structures. Keep referential integrity and historical meaning intact.

## Exercise identity rules
1. Define an exercise once; reuse its stable ID in multiple plans.
2. Plan-specific targets must not modify the canonical exercise.
3. Add custom exercises without replacing or duplicating existing ones.
4. Normalize names to suggest duplicates, but never automatically merge similar movements.
5. Renaming or archiving an exercise must preserve past workout history.

## Migration and data protection
1. Inspect the actual app storage schema and the JSON export before designing migration.
2. Create a verified backup and checksum before modifying data.
3. Preserve IDs and historical values, including anomalous timestamps and incomplete sessions; flag questionable records instead of silently rewriting them.
4. Make imports idempotent and generate a reconciliation report of counts and relationships.
5. Test offline writes, retries, cross-device updates, deletions, and conflicting edits.
6. Keep the original export and a rollback path until verification passes.

## Agent deliverables
- Repository and current-storage audit.
- Comparison of at least two feasible cloud/local/sync architectures.
- Written architecture decision with rationale, cost, tradeoffs, and risks.
- Proposed physical schema, migrations, and data-access contract.
- Working offline-first synchronization with tests.
- Canonical exercise library and reusable training plans.
- Desktop dashboard and phone-first logging.
- Migration reconciliation and release checklist.

## Coding-agent instruction
> Inspect the existing Progression Vert repository and exported data. Choose an appropriate cloud storage, offline local storage, authentication, synchronization, and API strategy based on the current stack and requirements. Do not assume a specific database or provider. Compare at least two options and document your decision before implementation. Preserve all workout history, stable exercise identity, offline writes, and cross-device consistency. Implement in reviewable stages with tests and a rollback plan. Request approval before irreversible or paid infrastructure changes.
