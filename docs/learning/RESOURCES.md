# Progression architecture resources

## Knowledge

- [Current app models](../../src/types/index.ts) and [SQL migration](../../supabase/migrations/202610170001_sync.sql).
  Primary evidence for this app's fields, private tables and RPC ownership checks.
- [Repository](../../src/storage/dexie/DexieRepository.ts), [sync coordinator](../../src/storage/sync/coordinator.ts),
  [account scope](../../src/auth/CloudProvider.tsx) and [category resolver](../../src/utils/muscleGroups.ts).
  Use these to trace real saves, acknowledgement, account changes and inferred categories.
- [React: your first component](https://react.dev/learn/your-first-component).
  Use for understanding pages and components as the visible frontend.
- [Dexie: liveQuery](https://dexie.org/docs/liveQuery%28%29).
  Use for why saved local data updates the screen through an observable.
- [Supabase: database functions](https://supabase.com/docs/guides/database/functions).
  Use for understanding the RPC functions called by the sync transport.
- [PostgreSQL: JSON operators](https://www.postgresql.org/docs/current/functions-json.html).
  Use for understanding data->>'category' and SQL NULL for missing JSON properties.
- [MDN: PWA offline operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation).
  Use for distinguishing cached application files from the database holding records.

External sources checked October 20, 2026. App-specific behavior is established by
the repository, not by a generic example from a provider's docs.

## Wisdom

- [Supabase GitHub discussions](https://github.com/orgs/supabase/discussions).
  Optional place to compare provider-specific behavior with maintainers; never post
  private exports or credentials. No community participation is required for this lesson.
