# Current application and storage audit

October 17, 2026. Initial audit findings below describe the baseline. The local-foundation
slice subsequently added session snapshots, transactional set allocation/export, valid
seed references and repository tests (see `todo.md`). No browser data or hosted records modified.

| Area | Files | Findings |
| --- | --- | --- |
| Entry and routing | `src/main.tsx`, `src/App.tsx`, `src/components/AppShell.tsx` | React 18, Vite 5, React Router; onboarding gates on local user name. No authentication or cloud SDK. |
| Persistence seam | `src/storage/repository.ts`, `RepositoryProvider.tsx`, `src/hooks/useObservable.ts` | Backend-neutral reactive reads and Promise writes; injectable fake repository for page tests. |
| Local schema | `src/storage/dexie/DexieRepository.ts` | Database `workout-tracker`; v1 settings/exercises/templates/sessions/logs, v2 runs, v3 body weights. Only this file imports Dexie. |
| Backup | `src/storage/legacyBackup.ts`, `src/pages/Settings.tsx` | v1 JSON backup, parser/report before replacement, all-store import transaction. Replacement is intentionally destructive after user confirmation. No merge import or cloud reconciliation yet. |
| Workouts | `src/pages/Dashboard.tsx`, `Workout.tsx`, `Summary.tsx`, `HistoryDetail.tsx` | Template start, fast set entry, previous values, warmups, completion and editing. Session names and set exercise names already snapshot; ordered session exercises need snapshots. |
| Exercise identity | `src/pages/TemplateEditor.tsx`, `Exercises.tsx`, `src/types/index.ts` | Stable exercise IDs exist, but editor resolves by lowercased name at save and can silently select a duplicate definition. No archive/merge workflow. |
| Runs and weight | `src/pages/Activity.tsx`, `src/components/RunForm.tsx`, `RunRow.tsx`, `BodyWeightSection.tsx` | Local editable records already work offline. No account partition or network status. |
| Analytics | `src/utils/personalRecords.ts`, `activity.ts`, `runMetrics.ts`, `src/components/ExerciseProgressChart.tsx` | Shared factual calculations and one exercise chart exist. No full desktop dashboard or muscle metadata. |
| Verification | `src/**/*.test.ts`, `src/**/*.test.tsx`, `.github/workflows/ci.yml` | Vitest/RTL tests; lint, tsc -b, coverage and build in CI. Repository persistence and account/sync integrity need coverage. |

## Risks to address before cloud cutover

- No actual `workout-backup-2026-10-13.json` found in this checkout. Approximate counts in the plan cannot establish migration correctness.
- Current settings store units globally; records lack historical unit metadata. Never guess old units when moving to a canonical model.
- Existing template deletion and modification must not alter newly started workout prescriptions; snapshot on start. Legacy sessions lack those snapshots and must retain fallback behavior without fabricated history.
- Set numbering originally read outside a transaction; simultaneous writes can choose the same position. Serialize allocation with insertion.
- Seeding empty templates when an exercise library already exists can generate unresolved exercise IDs; repair without rewriting historical records.
- Exports originally read stores independently, allowing a mixed snapshot during concurrent writes. Use a read transaction.
- IndexedDB persistence is subject to browser storage policies; retain explicit backups. Cloud transport must never imply successful delivery before acknowledgement.
- No authentication, ownership metadata, outbox, revision checks, cursor or tombstones exist. The HttpRepository is a stub, not a backend.

See [storage architecture decision](./storage-architecture-decision.md) for the selected direction and rollout gates.
