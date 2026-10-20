# Open work

Updated October 20, 2026. Completed tasks have been removed.
See [product requirements](product-requirements.md) for delivered behavior,
[local development](local-development.md) for validation evidence, and the
[agent guide](agent-development.md) for implementation boundaries.

## Migration and data integrity

- [ ] Reconcile the actual personal legacy export by every ID/value/reference;
  retain the untouched source and checksum.
- [ ] Complete a persisted migration/reconciliation journal, imperfect-payload
  quarantine and explicit unresolved-reference repair workflow.
- [ ] Verify historical charts against the actual export, including invalid records
  and ambiguous legacy units.
- [ ] Rehearse backup/restore and controlled rollout with current account data.

## Hosted sync and installed devices

The user reports Vercel/Supabase/OAuth setup. Verify the configured environment;
do not repeat project provisioning by default.

- [ ] Verify real Google and GitHub OAuth, production redirects, expired sessions,
  account switching and installed-app return behavior on phone and laptop.
- [ ] Exercise two-browser RPC sync with simultaneous edits, interrupted import,
  sign-out during requests, long offline gaps and deletion/conflict recovery.
- [ ] Verify installed Android/iOS launch/update/OAuth behavior, transition from the
  older auto-update shell and editing/drafts in other tabs.
- [ ] Review free-plan capacity and journal/receipt retention without automatically
  upgrading plans or pruning offline-client recovery data.

## Follow-up features and decisions

- [ ] Review and implement the [proposed shared catalog design](storage-architecture-decision.md#proposed-shared-catalog-design):
  maintainer-owned reference releases, repository-backed offline snapshots, stable
  IDs and a receipt-safe legacy migration. Design is documented; runtime remains code-defined.
- [ ] Review already-synced shoulder categories alongside the local v5 upgrade;
  a global remote taxonomy migration has not occurred.
- [ ] Resolve per-entry weight-unit provenance before canonical-unit history or
  broader health calculations. BMI currently follows active app units.
- [ ] Implement cycling logging before replacing its empty-state Logbook filter.
