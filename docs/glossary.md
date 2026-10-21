# Domain glossary

Use these names in code reviews, PRDs and issue descriptions. User-facing names
can differ from legacy module names.

| Term | Meaning |
| --- | --- |
| Today | The workout-start/rotation screen at the root route; also entry point for runs and weight |
| Dashboard | Charts, categories, streaks and calendar; legacy modules may be named Activity or Analytics |
| Logbook | Dated workout, run and weight records; legacy routes/modules retain History names |
| Exercise | A reusable movement definition with stable ID, category and optional metadata |
| Exercise alias | An interchangeable verified catalog name; compatible IDs share read-only history while saved IDs remain intact |
| Exercise category | One organizational bucket: Chest, Legs, Back, Shoulder, Core, Arms or Compound |
| Compound | An app navigation bucket for configured lifts such as deadlift/overhead press; not an anatomical muscle group |
| Shared catalog | Maintainer-published reference categories, presets and aliases; does not contain user workout records (proposed ownership model) |
| Catalog release | One complete immutable published version of shared reference data |
| Category ID | A durable category identity independent of its display label; proposed replacement for label-only references |
| Exercise preset | A shared reference movement and its default category; separate from each user's exercise definition |
| Preset binding | A reference linking a user exercise to an unambiguous shared preset without changing its identity |
| Category assignment | The category selected for a user exercise, including whether it is a user choice, known catalog default or preserved legacy value |
| Category override | A user's category choice for their own exercise; takes precedence over a preset default |
| Catalog snapshot | A complete release copied locally for consistent offline lookup and display |
| Retired definition | A category/preset no longer suggested for new selection but retained for historical and offline references |
| Reconciliation candidate | An uncertain legacy mapping needing review, rather than permission to rewrite stored meaning |
| Plan / workout template | An ordered training day with exercise assignments and prescriptions |
| Assignment | A particular placement of an exercise within a plan/session; repeated placements can share exercise ID but have distinct assignment IDs |
| Prescription | Planned sets, rep/time range and ordering; not a performed result |
| Rotation | The ordered loop of available training days used to derive the next day |
| Session | A workout occurrence with date/status and a snapshot of its plan at start |
| Completed session | A finished workout; category load charts exclude active sessions |
| Set / exercise log | One recorded exercise result with weight, reps or seconds, order and timestamp |
| Timed set | A set with time metric; seconds occupy the existing reps field |
| Warm-up | A recorded set excluded from working-set targets, records and load charts |
| Working set | A logged set not marked warm-up |
| Personal record | The heaviest logged working-set weight, then reps at that weight; computed live |
| Top sets | Distinct best recorded weight/reps combinations with their dates |
| Recorded load | A stored set's actual weight; never estimated 1RM or a projection |
| Category load | The heaviest recorded working-set load in a category across completed history |
| All history | All completed recorded sessions, independently of dashboard date/exercise filters |
| Run | A dated distance/time record, optionally with notes/feeling |
| Body-weight entry | A dated entered weight; historical per-entry units are not available |
| Adult BMI | A live height/weight screening calculation using CDC adult 20+ categories; not an individual diagnosis |
| Streak | Consecutive active calendar weeks or days derived from completed workouts and runs |
| Local-only repository | Original browser database used without an account; retained when signing in |
| Account repository | Browser database partitioned by Supabase project and account identity |
| Outbox | Locally persisted operations awaiting server acknowledgement |
| Operation | An immutable-ID atomic group of versioned entity mutations |
| Revision / version | Server-accepted entity version used to detect concurrent edits |
| Receipt | Server record making retries of an identical operation idempotent |
| Change journal / cursor | Ordered account changes and the client's last consumed position |
| Tombstone | A versioned deletion marker; prevents older records from being resurrected |
| Conflict | Competing versioned changes requiring an explicit local/cloud choice |
| Local-history merge | Automatic copy of missing original local records into a signed-in account; differing ID collisions are skipped/reported |
| Backup | Export of records; a recovery export can also retain sync intent/versions/conflicts |
| Reconciliation | ID/value/reference comparison of source and destination, beyond approximate row counts |
| PWA update | Replacement application shell installed through a deferred user-visible update flow |
