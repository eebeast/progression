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

## Proposed shared catalog design

Design date: October 20, 2026. **Design only; not implemented or deployed.**
The proposed ownership boundary is maintainer-managed shared reference data with
user-owned exercise records and category choices. Private custom categories are
not included in this first version; that would require a separate ownership model.
The ownership choice was presented to the user for feedback, not assumed confirmed.

### Ownership and scope

- Supabase owns the published shared categories, exercise presets, aliases and
  legacy muscle-label mappings. Maintainers publish reviewed catalog migrations;
  ordinary browser sessions can read the catalog but cannot change it.
- Each user still owns their exercise definitions, names, category assignments,
  plans and performed records. A shared preset is a reference definition, not a
  replacement for an account's exercise ID. Two logged IDs remain two histories.
- A user can override a preset's category for their own exercise. No shared catalog
  update silently replaces that choice or renames their saved exercise.
- The first release contains the current seven groups and all recognized exercise
  names/aliases. Overhead presses remain Compound; shoulder isolations use Shoulder.
- This moves the exercise/category reference catalog only. User workout templates
  and the four-day training-plan installer are not converted into shared SQL plans.

### Relational model and stable identity

Use a separate private reference schema, outside the account records journal.
The proposed relations are:

| Relation | Identity and contents |
| --- | --- |
| `catalog_releases` | Monotonic revision, payload format/normalizer versions, content checksum, publication time and publication state. Published releases are immutable. |
| `exercise_categories` | `(release_revision, category_id)` primary key; display label, order, retirement state and recognized legacy muscle/category labels. Stable IDs such as `chest` and `shoulder` survive label changes. |
| `exercise_presets` | `(release_revision, preset_id)` primary key; canonical display name, default category ID and retirement state. The category reference is a same-release foreign key. |
| `exercise_aliases` | `(release_revision, normalized_name)` primary key; same-release preset foreign key. Canonical names and alternate spellings share one unambiguous lookup namespace. |

Category IDs and preset IDs are immutable application identifiers; never regenerate
them from a display label during reads, reuse retired IDs or hard-delete referenced
definitions. A preset ID such as `barbell-row` is different from a user's exercise ID.
All release contents become visible atomically by publishing the release in the
same SQL transaction. Require a validated complete release before publication.

Reference foreign keys exist between these normalized reference tables. Account
exercises remain JSONB records, so validate their category/preset references inside
the existing atomic push boundary; do not claim JSONB fields acquire ordinary SQL
foreign keys by adding catalog tables.

Retirement hides an item from new UI suggestions without destroying its meaning.
Keep retired definitions readable and accept known retired IDs from offline writes;
a later server retirement must not strand an otherwise valid queued workout.
Unknown IDs need review instead of being guessed or discarded.

### Publishing and one source of authored data

Maintain one versioned catalog manifest containing stable IDs, labels, defaults,
aliases, legacy label mappings and retirement flags. Generate both the reviewed
SQL release insertion and the bundled offline snapshot from that manifest. CI
checks they reproduce the same revision/checksum; neither generated artifact is
edited independently. The deployed database is authoritative at runtime; the
bundle is only the last known release available without a network.

Use subsequent additive migrations for reference-data updates. Never edit an
already-applied migration, reset a hosted database or let a frontend silently seed
shared tables. Database migration remains a distinct deployment step.
[Supabase migration workflow](https://supabase.com/docs/guides/local-development/database-migrations)
documents applying pending migration files with `db push`.

Before publication, validate unique IDs, category order, canonical/alias uniqueness,
unambiguous legacy category labels, same-release references, supported formats and
complete retained definitions. Collapse redundant unlogged catalog aliases such as
Lateral Raise/Dumbbell Lateral Raise into one preset plus aliases. Do not collapse
the user's existing exercise rows or logged sets.

Keep normalization generic and versioned (case, whitespace and separators); store
movement-specific aliases and spelling variants as catalog data. Export and test
the current recognizer's behavior, including dumbell/dumbbell and tricep/triceps
variants, before replacing the existing normalization code.

### Read API, permissions and offline operation

Provide one read-only `get_exercise_catalog` RPC accepting the caller's supported
format and known revision/checksum. Return either an explicit unchanged result or
a complete immutable snapshot with revision, format, checksum, categories, presets
and aliases. Pick the latest published compatible release. Unknown formats retain
the previous valid local copy and expose a refresh error without blocking logging.

The catalog contains public reference information, so configured apps can refresh
it before sign-in using the public Supabase key. Explicitly grant only this read
function to `anon` and `authenticated`; no account data is returned. Revoke default
function privileges and all direct browser reference-table writes, enable RLS, use
a fixed empty search path with fully qualified names for a narrowly scoped definer
function, and test grants as both roles. These controls follow
[Supabase function security guidance](https://supabase.com/docs/guides/database/functions).
The existing account push/pull RPCs remain authenticated-only.

Keep UI reads behind `WorkoutRepository`: add one observable catalog snapshot read
and update Dexie/HTTP implementations together. Extend the transport/coordinator
boundary to refresh the catalog and atomically install a validated snapshot locally.
No component imports Supabase or fetches tables. Catalog failure must not prevent
private record sync, and private authentication failure must not block public
catalog refresh.

Add one Dexie cache store in v6, assuming v5 is still current when implemented.
Scope cached snapshots by project identity, including within the original local-only
database; do not reuse another project's revision merely because it is higher.
Store all rows of one snapshot together so observers never see half an update.
Cache changes are reference maintenance, not user mutations: exclude them from the
account outbox, conflict list and private change cursor.

At startup, prefer a valid project-scoped cache, otherwise the generated bundled
snapshot. Refresh on app-open/online/focus with bounded retry; retain cached data
on failure. Apply only validated, complete, compatible snapshots without a revision
rollback. A catalog rollback is a new, higher revision containing the earlier
definitions, not a decreasing version. A local-only app with no Supabase configured
continues to use the generated snapshot without any network requirement.

Refactor category pickers, filters, chart group ordering, preset cards and alias
resolution to consume the observed snapshot. Pure utilities accept catalog data
as input. Remove independent runtime category arrays and the closed label union
as the authority; runtime-check stable category IDs and display labels from the
snapshot. Adding a compatible catalog item must not require a frontend rebuild.

### Exercise assignment and legacy compatibility

Add optional metadata to exercise payloads: stable category ID, optional preset
binding and assignment provenance (`user`, `catalog-default`, `legacy-preserved`).
Keep the existing category label as a compatibility mirror while old clients and
backups are supported. A renamed shared label changes display through stable ID;
it does not rewrite session/exercise-name snapshots or performed values.

Resolution order:

1. A user category assignment wins, including a retained retired category.
2. Preserve a valid legacy saved category as `legacy-preserved`; map its label to
   a stable ID without reinterpreting it from the exercise name.
3. A catalog-default assignment follows the linked preset's category. Only rows
   known to use defaults follow future default changes; show that provenance in
   exercise editing so choosing a category makes the override explicit.
4. For old uncategorized definitions, resolve a known saved muscle label, then an
   exact unambiguous name/alias. Bind a preset only on that exact match, preserving
   the user's exercise ID/name. Historical logs missing a definition retain the
   same fallback through their recorded name, without inventing an exercise row.
5. Unknown/ambiguous references retain their raw metadata and remain in Logbook.
   Do not invent an Unspecified dashboard bucket or silently choose a movement.

Preexisting saved categories have no reliable provenance. Do not treat a matching
name as proof that a saved Arms/Back category was an automatic default. Known
shoulder-isolation mismatches become reconciliation candidates, not an unconditional
mass rewrite. Local v5 may already have changed some rows; compare accepted remote
versions, pending work and conflicts before deciding on a correction. Apply any
confirmed correction as a normal revisioned account operation, with an audit of
the before/after category; never update private JSONB directly or bypass the journal.

Deploy a compatibility bridge before clients start writing IDs. Old clients send
full exercise payloads and may retain a category ID while editing only the legacy
label. At the push boundary compare incoming metadata against the accepted record:
an edited legacy label with an unchanged ID is a legacy user choice and must update
the resolved assignment; conflicting independently changed ID/label pairs are
rejected for review. ID-based assignments return a consistent label mirror.

Perform any compatibility normalization only after the existing operation-receipt
lookup. Preserve the immutable request in its receipt, return the normalized
accepted payload, and journal exactly that accepted payload. Replaying an already
received operation returns its original result even if the catalog later changes.
Do not rewrite queued request bodies, IDs, accepted versions or cached receipts.
New validation must not scan/reject unrelated older records merely because a newly
introduced category field is absent. Category IDs are checked when introduced or
changed; unrelated set/run updates keep their existing compatibility contract.

### Backup and migration sequence

1. Export the current app catalog/alias behavior and supplied-exercise fixtures.
   Assign stable IDs and generate release 1 with all seven categories. Produce an
   inventory/report of duplicate aliases, unknown saved labels and shoulder
   mismatches before changing user data.
2. Add the shared schema, release seed and read RPC through new SQL migrations.
   Add the push compatibility bridge without requiring new metadata from old apps.
   Prove replay, ownership and old-client behavior with SQL tests before deployment.
3. Add the Dexie cache store, generated fallback, validator and observable repository
   read. Extend backup export/import and validation for the new store. Store the
   reference snapshot as optional backup metadata outside the user-record outbox
   collections, keeping v1/v2 imports valid and preserving exercise unknown fields.
4. Accept imported snapshots only as validated source-scoped reference evidence;
   never publish them to Supabase or replace a newer project-authoritative cache.
   Unknown foreign-project IDs remain unresolved for explicit mapping before
   account import queues affected records. Missing snapshots use the compatible
   cache/bundle, not invented labels.
5. Refactor picker/catalog/analytics consumers to the repository snapshot and dynamic
   IDs. Verify every historical identity and zero-weight load still appears. Only
   then remove handwritten runtime catalog arrays; keep historical v5 migration
   behavior frozen to its original input rather than making it depend on a future
   live catalog.
6. Introduce assignment metadata through resumable ordinary repository operations.
   Drain or respect earlier pending operations, retain explicit legacy choices and
   report unresolved rows. Give migration-generated changes stable intent and
   progress tracking so restarts do not duplicate writes. Never rewrite an existing
   queued operation to append metadata.
7. Run a preview/reconciliation for already-synced shoulder mismatches. A confirmed
   choice uses the same conflict-aware push path; concurrent edits remain conflicts.
   Re-running the process skips already resolved unchanged rows.
8. Roll out SQL compatibility first, then the new client. Keep both label/ID reads
   during the compatibility window, retain original backups and compare actual
   record IDs/counts/set values before marking migration complete. Retire the
   legacy label contract only in a separately versioned, explicitly verified change.

No migration edits log weights/reps, timestamps, names, session prescriptions,
exercise IDs or template assignments. A catalog SQL release never implies all
account records were reconciled or all devices consumed it.

### Tests, implementation slices and acceptance

Use the existing repository-injected page seam for the primary acceptance tests.
Feed two snapshots to the same mounted UI: renamed labels and a newly added category
must appear without code changes, while a user's chosen category and every recorded
exercise/set remain intact. Both local-only and cached offline startup must work.

Add focused tests at the existing boundaries:

- SQL: public reference reads; forbidden browser catalog writes; category/preset
  foreign keys; alias collision rejection; atomic release publication; old-client
  label edits; ID/label disagreement; unchanged receipt replay after catalog changes;
  unknown IDs and known retired IDs; account isolation unchanged.
- Repository: v5-to-v6 upgrades, project-scoped caches, malformed/partial/unsupported
  snapshot rejection, backup round trips, transaction rollback, pending/conflicted
  rows during metadata backfill and restart-safe migration progress.
- Pure resolver: all current alias fixtures, legacy saved choices, retired entries,
  unresolved foreign IDs and shoulder candidates without guessed provenance.
- Browser: offline create/log/restart, reconnect and refresh from the shared catalog,
  cross-device category edits, and old/new client coexistence. These require real
  transport checks before claiming hosted migration readiness.

Recommended small implementation commits: (1) SQL schema/seed/read API and security
tests; (2) receipt-safe push compatibility; (3) cache/repository/fallback/backups;
(4) dynamic UI/resolver consumers and parity tests; (5) resumable metadata migration
and shoulder review; (6) hosted/offline/old-client verification and documentation.
Each slice preserves the existing logging path; do not deploy a client dependency
before its compatible SQL release is available.

The design is ready for implementation review when the ownership choice, stable
IDs, snapshot contract and compatibility tests above are accepted. Runtime behavior
remains as documented in the current PRD until these slices are implemented.

### Alternatives considered

- **Keep editing TypeScript arrays:** simpler now, but cannot update the shared
  catalog independently of a frontend release and repeats alias/default ownership.
- **Use only category label strings:** fewer new fields, but labels become unstable
  identity and renamed categories make migrations and old-client edits ambiguous.
- **Let clients write shared catalog rows:** convenient administration, but confuses
  account-owned edits with global defaults. Maintain a separate review/publication
  boundary instead; no catalog admin screen is needed initially.
- **Rewrite every account exercise in SQL:** fast, but bypasses receipts/change
  journal semantics, conflicts and unknown user provenance. Use ordinary versioned
  account operations only where metadata actually needs migration.
- **Fetch remote categories directly in UI:** avoids a cache layer but breaks the
  repository boundary, local-only startup and reliable offline exercise creation.
