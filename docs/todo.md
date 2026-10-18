# Progression implementation status

Updated October 18, 2026. Branch: `feat/supabase-offline-sync`.
Execution specification: [Supabase plan](./supabase-implementation-plan.md).
Setup and recovery: [local development](./local-development.md).

## Implemented locally

- [x] Repository/current-storage audit and comparison of Supabase, Firebase,
  Cloudflare and Neon. Supabase free plan and Google sign-in are selected.
- [x] Legacy backup validation, warnings, exact-record reconciliation utility and
  SHA-256 source inspection utility. Transactional import/export and re-import tests.
- [x] Session prescription snapshots, valid seed references and serialized set numbering.
- [x] Account/project-specific databases and remounted UI scopes. Cached account
  logging remains available when session refresh cannot reach the network. Explicit
  sign-out locks local access even if the remote request fails.
- [x] Additive v4 outbox/version/cursor/conflict stores, immutable operation IDs,
  transactionally queued writes, parent dependencies and bounded staged imports.
- [x] Private PostgreSQL records, RLS/grants, transactional push, replay receipts,
  version conflicts, tombstones and serialized paginated pull. SQL authorization,
  replay, rollback and account-isolation tests pass on local Supabase via Colima.
- [x] Foreground retry/backoff with request timeouts, Web Locks where available,
  acknowledgement handling, protected pending dependencies, late-response isolation
  and explicit conflict resolution. Two-client repository simulations cover lost
  responses, conflicting edits and deletion.
- [x] Settings Google sign-in, sync status/retry, explicit local-history copy and
  separately chosen preferences. Recovery backups retain both versions and can be
  opened for local review without replaying a foreign outbox.
- [x] Canonical exercise reuse, duplicate warnings, archive and explicit merge audit.
- [x] Exact four-day Pull / Push / Legs + Abs / Mix preset. Existing days/history are
  retained when applying it. Plain exercise-name entry without dropdowns; management
  controls remain collapsed, following user feedback.
- [x] Local save error handling and double-tap protection, repeated assignment IDs,
  undo and recap formatting. The workout add-exercise form and rest timer controls
  were removed following user feedback; exercises remain editable in the day plan.
- [x] Optional factual weekly/monthly/custom activity summaries, exercise/plan/muscle
  filters, running totals/pace and dated body weights. No estimates, trends or advice.
- [x] PWA install guidance, offline-ready message, deferred update prompt, manifest
  identity and explicit hosting route rewrites. Chromium production-build checks cover
  offline browser restart and the simplified desktop plan/editor flow.

## Remaining release gates

- [ ] Obtain the actual personal legacy export, checksum it privately, inspect all
  irregular records and reconcile every ID/value/reference against the destination.
  Approximate counts in the original spec are not verification evidence.
- [ ] Persist a dedicated migration/reconciliation journal and implement repair of
  unresolved legacy references before any production cutover. Current import warnings
  and backup utilities preserve the source but do not constitute a completed migration.
- [ ] Configure a hosted free Supabase project and Google OAuth. Verify real consent,
  callback, expired authentication and account switching on phone and laptop.
- [ ] Run genuine two-browser synchronization against the real RPC transport, including
  simultaneous writes, interrupted migration, logout during a request and long offline gaps.
  In-memory transport tests and separate SQL tests are not a substitute.
- [ ] Validate installed Android/iOS behavior, OAuth returns across browser contexts,
  service-worker upgrade from the previous auto-update release, and drafts in other tabs.
- [ ] Complete full runtime validation/quarantine for imperfect legacy payloads and
  independently verify analytics against the actual export (including unit ambiguity).
- [ ] Review free-plan capacity and journal/receipt retention before long-term use;
  do not prune offline-client recovery data or upgrade a paid plan automatically.
- [ ] Perform controlled rollout with a fresh source backup and recovery rehearsal.
  No hosted deployment, production cutover or legacy deletion has occurred.
