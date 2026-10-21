# Progression: current product and agent-development PRD

Updated October 20, 2026. This consolidates accepted requirements from the product
conversation and the current implementation. It is a baseline for maintaining and
extending the existing app, not an instruction to rebuild delivered features.
Current behavior is described here; the accompanying task list contains open work only.

## Problem Statement

Users need a simple workout recorder that works offline, preserves their historical
sets and shows their records clearly on phone and laptop. Earlier iterations added
controls and navigation that made logging harder, and some historical movements
disappeared from category charts. Optional cloud sync must preserve local history
and make reconnecting straightforward.

Future AI agents face a second problem: older prompts, plans and the README describe
different products. They can incorrectly remove cloud support or BMI, reintroduce
rejected workout controls, confuse Today with Dashboard, or treat planned storage
features as delivered. Current decisions and remaining verification must be explicit.

## Solution

Maintain one local-first React/Vite PWA with a quiet logging flow, a factual
Dashboard, an editable Logbook and optional Supabase account sync. Preserve the
original visual theme and stable workout identities. Record accepted behavior in
a current PRD, development guide, glossary and runnable setup documentation. Remove
obsolete proposals from active docs and keep validation evidence separate from intentions.

## User Stories

1. As a lifter, I want to open Today and see my training days, so that I can start logging quickly.
2. As a lifter, I want the supplied four-day Pull, Push, Legs + Abs and Mix preset, so that my routine is already configured.
3. As a returning user, I want installing a preset to retain previous plans and history, so that new configuration does not erase my records.
4. As a lifter, I want to start any available day and reorder the rotation, so that my schedule remains flexible.
5. As a lifter, I want plain exercise-name, sets and reps inputs in plan editing, so that I can maintain a day without a complex picker.
6. As a lifter, I want each new exercise to have a category, so that its records appear under an understandable group.
7. As a lifter, I want familiar exercise aliases to resolve consistently, so that spelling variations do not hide my records.
8. As a lifter, I want recorded exercise IDs kept separate unless I explicitly merge them, so that distinct histories are not silently combined.
9. As a lifter, I want changes to a plan to leave started workout prescriptions intact, so that past sessions retain their meaning.
10. As a lifter, I want large weight/reps controls and clear save feedback, so that I can log between sets on a phone.
11. As a lifter, I want timed sets to preserve seconds, so that holds and duration exercises are recorded correctly.
12. As a lifter, I want warm-ups kept in history but excluded from working-set records and charts, so that summaries reflect actual working sets.
13. As a lifter, I want to edit, delete, reorder and undo recorded sets, so that mistakes are correctable.
14. As a lifter, I want previous performance and recorded personal bests, so that I can recall facts without generated training advice.
15. As a lifter, I want an exercise page with dated top sets and recorded progress, so that I can inspect its history.
16. As a user, I want Today to record runs and body weight, so that entry happens beside workout logging.
17. As a user, I want run and body-weight lists in Logbook, so that the Dashboard stays focused on charts.
18. As a user, I want Logbook type and date filters, so that I can find a workout, run or measurement quickly.
19. As a user, I want an honest empty Cycles filter until cycling entry exists, so that the interface does not imply unsupported records.
20. As a user, I want workout and run charts with week, month, year and custom periods, so that I can view different spans of recorded activity.
21. As a user, I want Chest, Legs, Back, Shoulder, Core, Arms and Compound categories, so that major movement groups are easy to browse.
22. As a user, I want category load charts built from completed historical working sets, so that old records contribute to the displayed values.
23. As a user, I want clicking a category to show every exercise in it, so that the view is not restricted to one selected movement.
24. As a user, I want every recorded set load, including zero added load, in each exercise graph, so that I can inspect actual performance over time.
25. As a user, I want historical load charts independent of optional workout/date filters, so that my earlier strength records do not disappear.
26. As a user, I want unknown movements retained in history without an Unspecified dashboard bucket, so that no data is lost or falsely categorized.
27. As a user, I want current/best day or week streaks and earned badges from recorded activity, so that consistency is visible without fabricated goals.
28. As a user, I want separate streak and calendar cards with correctly proportioned dates, so that both remain readable on my phone.
29. As a user, I want a calendar date to open matching Logbook records, so that I can inspect that day's activity.
30. As a user, I want consistent themes, fonts and layouts on phone and laptop, so that navigation feels familiar.
31. As a keyboard or screen-reader user, I want accessible controls and chart values, so that graphs are not the only way to access records.
32. As a user, I want to save height in centimeters or inches, so that the app can use the measurement I enter.
33. As an adult user, I want BMI from saved height and my latest dated weight, so that I can see the standard adult screening category.
34. As an adult user, I want a clear notice outside the adult BMI reference range, so that I can recognize a potential health-risk indicator.
35. As a strength-training user, I want BMI's age and muscle-mass limitations explained, so that a screening number is not mistaken for a diagnosis.
36. As a user with missing measurements, I want links to enter height or weight instead of an invented BMI, so that I know what is needed.
37. As a privacy-conscious user, I want local-only use without configuring an account, so that cloud setup is optional.
38. As a signed-in user, I want Google and GitHub options, so that I can use a configured provider.
39. As a signed-in user, I want original local history merged automatically while online, so that I do not need refresh or copy-history controls.
40. As a signed-in user, I want my account preferences and existing differing records preserved during that merge, so that local copies cannot silently overwrite them.
41. As a user, I want pending/error/conflict status to remain truthful, so that a local save is not confused with successful cloud delivery.
42. As a user, I want deleted cloud records protected by tombstones, so that retained local history cannot recreate them later.
43. As a user, I want account/project isolation and safe sign-out, so that records and delayed responses cannot cross account boundaries.
44. As an offline user, I want cached account logging and queued changes to survive restart, so that losing connectivity does not lose my workout.
45. As a user, I want explicit conflict choices and recovery exports, so that I can review competing changes before replacing them.
46. As a user, I want installation and deferred PWA updates, so that the app can launch offline and updates do not interrupt entry.
47. As a maintainer, I want Vercel/Supabase setup documented for Vite, so that incorrect environment names or redirect URLs do not disable cloud sync.
48. As a maintainer, I want frontend deployment distinguished from database migration, so that a new build is not mistaken for schema provisioning.
49. As a future AI agent, I want a current documentation map and glossary, so that I find the right behavior and terminology before editing.
50. As a future AI agent, I want implemented features separated from verification gaps, so that I do not claim unsupported release readiness or rebuild existing work.
51. As a future AI agent, I want the repository seam and testing patterns documented, so that changes preserve local-first behavior and are testable without new abstractions.
52. As a maintainer, I want small commits and accurate change reports, so that later agents can review and continue work safely.

## Implementation Decisions

- Retain the existing React, TypeScript, Vite, Tailwind, React Router, Dexie,
  Recharts and PWA stack. A frontend rewrite or Next.js migration is not required.
- Keep one repository interface as the UI persistence seam. Observables drive reads,
  promises represent writes, and providers inject a repository into pages. Update
  the local implementation and HTTP completeness stub when adding methods.
- Keep Today, Dashboard and Logbook as distinct user-facing responsibilities while
  preserving legacy route/module compatibility. The old analytics route redirects
  to Dashboard.
- Preserve the existing tokens/theme and a responsive mobile/desktop shell.
  The desktop pane scrolls within its fixed frame; chart accessibility tables must
  not enlarge the document or create horizontal mobile overflow.
- Keep the requested four-day preset and plain plan-entry flow. Rest-timer controls,
  workout add-exercise forms and exercise-name dropdowns remain removed.
- Preserve stable exercise IDs, assignment IDs and session prescription/name
  snapshots. Alias normalization is for catalog matching/display, not automatic merging.
- Known catalog aliases can share a read-only all-history view across old/new IDs.
  Category graphs, exercise history/records, previous values and exercise filters
  include every original set. Preserve separate category/equipment choices,
  user-confirmed distinct movements and unknown custom identities. Preset/plan
  entry reuses compatible existing aliases to avoid creating fresh duplicates.
- Require categories for new exercise UI; use saved metadata and known aliases to
  resolve legacy records. Explicit categories win after migrations. Keep missing
  definitions/historical names visible without inventing ambiguous classifications.
- Maintain seven single-choice organizational categories. Shoulder isolations use
  Shoulder; overhead presses remain Compound. A one-time local database upgrade
  corrects known shoulder-isolation defaults formerly in Arms/Back.
- The category list and configured catalog currently live in application code;
  exercise records persist/sync their category. A shared database taxonomy/catalog
  and corresponding remote migration have not been implemented.
- Chart individual historical working-set loads across all completed sessions and
  all exercises. Workout/run/body-weight period controls do not narrow that history.
  Exclude warm-ups and active sessions without dropping zero recorded load.
- Derive records, streaks and charts live rather than persisting summary flags.
  Adult BMI is the specifically authorized exception to the facts-only policy.
- Save height canonically in centimeters. Derive adult BMI from the latest
  non-future body-weight measurement, using active-unit semantics and pounds-to-kg
  conversion only inside the formula. Do not infer missing historical units.
- Use CDC adult 20+ BMI thresholds: underweight below 18.5; healthy weight 18.5 to
  below 25; overweight 25 to below 30; obesity 30 or above. Classify the unrounded
  result; missing/nonpositive/nonfinite inputs yield no result. Explain screening
  limitations and flag out-of-range values without disease prediction.
- Retain original local-only data alongside separate project/account databases.
  Optional Google/GitHub auth enables foreground sync while the app is open/resumed.
  Explicit sign-out hides account data and retains its pending changes.
- Automatically merge original local records after checking account state; preserve
  account preferences, skip/report differing IDs, respect accepted deletions, and
  retain original local data. No manual refresh/copy/sync controls are required.
- Keep atomic local entity/outbox writes, immutable operation IDs, idempotent server
  receipts, revision checks, deletion tombstones, ordered paginated pull and explicit
  conflict resolution. Do not clear pending work before acknowledgement.
- Use Supabase Auth/PostgreSQL with private versioned JSONB records and authenticated
  push/pull RPCs. SQL ownership derives from the authenticated account. Normal UI
  code does not query private tables or use database credentials.
- Keep Vercel as a compatible static Vite host with route fallbacks. Use public
  Vite-prefixed Supabase variables, provider configuration and explicit database
  migrations; do not expose service-role keys or provider secrets to the browser.
- Cache the app shell for offline launch and prompt before applying updates. Do not
  promise uploads while the app is closed or treat a dev server as a PWA verification.
- Keep the README documentation map current and remove obsolete plans/prompts from
  active docs; Git history retains them. Keep only open work in the task list.
  Update the agent instructions, current PRD and validation evidence when behavior changes.

## Testing Decisions

- The primary UI seam is a page rendered with an injected fake workout repository
  and in-memory router. Assert what a user sees and does through accessible queries,
  not internal state, component structure or duplicated implementation logic.
- Existing Today/Dashboard, analytics, workout and Logbook page tests are the prior
  art for that seam. No new data-access abstraction or UI testing layer is required.
- Use focused pure-function tests for BMI thresholds/invalid inputs/imperial units,
  category aliases, all-history set loads, personal records and calendar/streak ranges.
- Test height/weight changes, empty-state navigation and outside-reference-range
  messaging through the BMI component; test full-history selection through Dashboard.
- Preserve the regression fixture of the supplied exercises and tests proving every
  category movement exposes every recorded load, including zero and old records.
- Use fake IndexedDB repository tests for atomic writes, rollback, backup round trips,
  snapshots, collision handling, deleted-record protection and local schema upgrades.
- Simulate retries, lost responses, concurrent edits and account transitions at the
  sync-repository/transport boundary. SQL tests separately establish authorization,
  replay behavior, atomic groups and cross-account denial for real RPC contracts.
- Use production-build Playwright checks for phone/desktop layout, dark themes,
  navigation and offline browser restart. Verify document width stays within the
  mobile viewport and saved records survive offline restart.
- Run lint, authoritative project-reference typecheck, relevant tests and production
  build for code changes. For documentation-only edits, validate links, commands,
  source consistency and historical/current labels rather than generating new tests.
- Keep hosted OAuth, real two-browser sync, Android/iOS installed-app behavior and
  actual-export reconciliation as separate validation work. Mocks, local SQL and
  Chromium-only tests do not establish those outcomes.
- Latest code evidence before this documentation change: 257 Vitest tests across
  37 files, four Playwright scenarios, typecheck/build pass; lint has existing warnings
  and no errors. The last documented local SQL run passed 19 tests on October 18.
- These seams preserve the existing architecture; the PRD introduces no new runtime
  interface. The testing approach was presented to the user for feedback during
  preparation of this document.

## Out of Scope

- Rebuilding already delivered features or executing old scaffolding prompts.
- Rest-timer controls, workout add-exercise forms and exercise-name dropdowns.
- Estimated 1RM, recommended weights, coaching, predictive strength, inferred muscle
  growth, personalized disease-risk scoring, BMI diagnosis or new goal features.
- Child/teen BMI percentiles, pregnancy-specific interpretation or body-fat estimation.
- Guessing missing legacy values, silently converting historical units or automatically
  merging distinct exercise identities.
- A normalized/shared database taxonomy unless approved as separate work; documenting
  that gap must not imply it already exists.
- Cycling entry, social feeds, collaboration and app-store/native packaging.
- Paid infrastructure changes, destructive migration/cleanup or a claim that a Git
  commit constitutes deployment or production-data reconciliation.
- Guaranteed sync while the app is closed, or verified installed-device/hosted
  behavior without the corresponding real environment checks.

## Further Notes

- Most product behavior above is implemented. The open task list identifies
  remaining migration, hosted/device validation and taxonomy follow-up. An agent
  should inspect that list before choosing a task rather than implement this PRD again.
- A [proposed shared catalog design](storage-architecture-decision.md#proposed-shared-catalog-design)
  now defines maintainer ownership, stable IDs, offline snapshots and legacy
  compatibility. It is a design deliverable; shared database ownership is not yet runtime behavior.
- The user reports configuring Vercel, a hosted Supabase project, database migration
  and OAuth credentials. Successful end-to-end production operation has not been
  independently established by this documentation update.
- Obsolete scaffold/audit/plan documents have been removed from the working tree.
  Git history retains them; the storage decision preserves useful rationale.
  Current requirements and later explicit user decisions govern future changes.
- BMI reference: [CDC adult BMI categories](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html)
  and [BMI FAQ](https://www.cdc.gov/bmi/faq/index.html), verified during BMI implementation.
- Read the [README documentation map](../README.md), [agent guide](agent-development.md),
  [glossary](glossary.md), [open tasks](todo.md) and
  [architecture decision](storage-architecture-decision.md) together. The issue-tracker
  copy mirrors this PRD at publication; the repository copy remains the maintained reference.
