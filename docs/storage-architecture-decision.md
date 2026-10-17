# Storage architecture decision

Status: Supabase selected by the user; Google sign-in confirmed.
No hosted infrastructure created or production cutover.
Reviewed October 17, 2026. The user is willing to create a free backend account.
Authentication preference: Google sign-in.

The executable stage plan is [supabase-implementation-plan.md](./supabase-implementation-plan.md).

## Options evaluated

| Option | Local writes and sync | Integrity and ownership | Cost and tradeoffs |
| --- | --- | --- | --- |
| Supabase Auth + PostgreSQL + existing Dexie | Keep IndexedDB reads; transactional application outbox and RPC push/pull | SQL transactions, revision checks, account-scoped foreign keys and RLS | Free plan within quotas; idle free projects may pause. More sync code, but preserves the existing repository and supports explicit conflicts. |
| Firebase Auth + Firestore | Firestore persistent cache or Dexie outbox with Firestore transactions | Security Rules, document ownership, application-level relationship checks | No-cost quota; document operations count toward usage. Built-in offline last-write-wins needs additional revision/conflict handling to meet this spec. Replacing Dexie risks migration regressions. |
| Cloudflare Workers + D1 + Google identity | Keep Dexie and write a custom Worker sync API | SQLite SQL semantics, transactional batches; verify Google tokens and enforce ownership in the API | Free Worker/D1 quotas; more custom authentication and API maintenance. |
| Neon PostgreSQL + managed auth/functions or Worker API | Keep Dexie and implement the same revision-aware outbox protocol | PostgreSQL transactions; application ownership policies and authenticated endpoints | Free plan currently lists 1 GB/project and 100 CU-hours/project/month. Viable SQL alternative; validate auth/runtime integration before choosing. |

Choose Supabase and retain Dexie. This is an engineering decision based on the relationship-heavy existing model and explicit concurrent-edit requirements, not a claim that Supabase supplies offline sync automatically. No paid tier is authorized or required for initial setup. Re-evaluate capacity if usage reaches free limits; do not automatically upgrade.

Sources checked for this decision:

- [Supabase pricing](https://supabase.com/pricing)
- [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Firestore offline persistence and conflict behavior](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Firestore free quota and billing](https://firebase.google.com/docs/firestore/pricing)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Neon pricing](https://neon.com/pricing)

## Data contract for implementation

Keep `WorkoutRepository` as the UI seam. Remote access belongs behind a transport, not in components. Local record mutation and outbox insertion must commit in one IndexedDB transaction. Outbox operations carry account ID, immutable operation ID, entity ID, base revision and payload. Remote acknowledgements are per operation. A successful HTTP request alone must never clear the queue.

Use separate account databases; retain the existing `workout-tracker` database as an unclaimed local source. Signing in must not implicitly upload it. Require an explicit claim/import workflow and backup before copying its records. Signing out switches away from the account database; queued operations stay partitioned by their original account.

Proposed remote tables: account settings, exercises, templates, sessions, sets, runs, body weights; operation receipts and an account change journal. All entity keys include ownership, and child relationships must verify the same owner. Preserve source IDs, including non-UUID legacy IDs. Template assignments can initially stay ordered JSON within a template, protected by the template revision. New sessions snapshot their ordered exercises and prescriptions. Existing log names and session template names remain snapshots.

Mutations use authenticated SQL RPCs, version checks and receipts in one transaction. RPCs derive ownership from `auth.uid()`, never from a submitted owner ID. Retain tombstones and conflict payloads. Serialize writes per account before assigning change sequence values so a pull cursor cannot skip a transaction that commits later. Pull pages use a stable cursor. New clients bootstrap through that same ordered journal. Do not expose direct write access that bypasses this protocol. Enable RLS and test unauthenticated and cross-account denial.

Preserve legacy weight numbers and their active-unit semantics. Do not retrospectively assume kilograms: historical per-entry units are unavailable. A canonical-unit migration requires an explicit user decision and cannot infer old units. Keep analytics factual; estimates, goals, rolling averages and advice in the broader plan are excluded under AGENTS.md.

## Rollout and remaining gates

1. Finish local repository regression tests and historical snapshots.
2. Obtain the actual legacy export; checksum the untouched file and reconcile all records. It is not present in the repository during this audit.
3. Add SQL migrations, authentication, account-scoped local storage and tested push/pull transport.
4. Exercise retries, conflicts, restart persistence, deletion and account switching with two clients before enabling production sync.
5. Preserve the old local database and downloadable backups throughout cutover. To roll back before cutover, keep using the local deployment. After cutover, export account data before reverting; a code rollback alone does not move cloud changes back into the original local database.

Creating a free Supabase project is the next external setup step. Browser configuration needs only its project URL and public publishable key. Administrative/service-role keys must never enter the browser or repository.
