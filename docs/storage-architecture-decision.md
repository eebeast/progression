# Storage architecture decision

Status: accepted. Supabase + Dexie selected; Google and GitHub sign-in implemented.
Original decision October 17, 2026; amended October 20, 2026 after user feedback.
The user reports Vercel/Supabase/OAuth setup. Hosted end-to-end operation and actual
legacy-export reconciliation are not established by this decision document.

Read the [current PRD](product-requirements.md), [agent guide](agent-development.md)
and [open tasks](todo.md) alongside this decision. Obsolete stage plans are retained
in Git history rather than active documentation.

## Accepted amendments

- **Automatic local-history merge:** the user removed manual refresh/copy controls.
  When signed in and online, check account state and merge original local records
  automatically. Preserve account preferences, skip/report differing IDs, respect
  accepted tombstones and retain the original local database. This supersedes the
  original manual claim requirement.
- **Providers:** support both Google and GitHub through Supabase Auth.
- **BMI:** adult BMI from saved height/latest weight is a user-approved exception
  to the facts-only rule; never turn the screening category into a diagnosis.
- **Taxonomy:** Shoulder is now included. Categories remain code-configured and
  stored on exercise payloads; a shared SQL taxonomy is not yet implemented.

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

Use separate account databases; retain the existing `workout-tracker` database as
the original local source. Signing in while online triggers the non-destructive
automatic merge described above. Signing out switches away from the account database;
queued operations stay partitioned by their original account.

Logical entities include account settings, exercises, templates, sessions, sets,
runs and body weights. The implemented physical schema uses private JSONB records,
receipts, account state and an ordered change journal (see refinement below).
All entity keys include ownership, and child relationships verify the same owner.
Preserve source IDs, including non-UUID legacy IDs. Template assignments stay ordered
JSON within a template protected by its revision. New sessions snapshot exercises
and prescriptions; logged exercise/session names retain historical meaning.

Mutations use authenticated SQL RPCs, version checks and receipts in one transaction. RPCs derive ownership from `auth.uid()`, never from a submitted owner ID. Retain tombstones and conflict payloads. Serialize writes per account before assigning change sequence values so a pull cursor cannot skip a transaction that commits later. Pull pages use a stable cursor. New clients bootstrap through that same ordered journal. Do not expose direct write access that bypasses this protocol. Enable RLS and test unauthenticated and cross-account denial.

Preserve legacy weight numbers and their active-unit semantics. Do not retrospectively assume kilograms: historical per-entry units are unavailable. A canonical-unit migration requires an explicit user decision and cannot infer old units. Keep analytics factual; estimates, goals, rolling averages and advice in the broader plan are excluded under AGENTS.md.

## Implemented physical schema and recovery

The local implementation uses private account-scoped JSON payload records plus
receipts and an ordered change journal, rather than one remote SQL table per legacy
entity. This preserves unknown legacy fields and keeps the browser repository
adapter small. Authenticated RPCs validate revisions and same-owner references for
an entire atomic group; direct browser table access is revoked and RLS is enabled.
Full per-field legacy validation, a persisted migration journal and real-export
reconciliation remain release gates. See `todo.md` for verification boundaries.

Private records use `(user_id, store, id)` keys with a server revision, JSONB data
and update timestamp. A null payload represents a versioned deletion. Physical
tables are `workout_private.records`, `account_state`, `receipts` and `changes`;
public authenticated `sync_push`/`sync_pull` functions expose the protocol. The
checked-in SQL migration/tests and typed transport are the contract, not an older
proposal for per-entity remote tables.

Imports preserve IDs and unknown legacy payload fields. Account imports merge
records and produce fresh bounded parent-first operations, never replaying another
database's outbox. Recovery exports preserve versions, pending intent and conflicts.
Local-only replacement imports remain explicitly confirmed and transactional.

Preserve the original local database and downloadable backups throughout cutover.
After cloud edits begin, export current account data and reconcile pending work
before reverting; a code rollback alone does not copy cloud changes back into the
original local database. Never delete source records as release cleanup.

Browser configuration uses only the project URL and public publishable key.
Administrative/service-role keys stay out of the browser/repository. Provider
pricing/quota comparisons above are dated research, not current quota guarantees.
The remaining task list contains only open work; local validation evidence is in
the setup guide.
