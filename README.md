# Progression 🏋️

A local-first workout tracker for phone and laptop. Log offline, install it as a
PWA, and optionally sync across devices with Supabase and Google/GitHub sign-in.

## Features

| Screen | What you can do |
| --- | --- |
| **Today** | Start a workout, reorder training days, add runs and body weight |
| **Workout** | Log weight/reps or timed sets, mark warm-ups, edit sets and recall previous values |
| **Dashboard** | View activity charts, streaks, a calendar and every exercise’s recorded loads |
| **Logbook** | Browse and edit workout, run and body-weight history |
| **Plans** | Use the four-day Pull / Push / Legs + Abs / Mix preset or edit your days |
| **Settings** | Change appearance, save height, manage backups and review cloud sync |

Categories: **Chest, Legs, Back, Shoulder, Core, Arms and Compound**.
Compatible exercise aliases share history while preserving saved IDs. Different
equipment, category choices and explicitly distinct movements stay separate.

The app shows recorded facts, without training predictions or coaching.
Adult BMI is an optional screening calculation from saved height and weight;
it is not a diagnosis and cannot distinguish muscle from fat.

## Run locally

Requires **Node.js 22+**.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. No account or cloud credentials are needed.
To check offline/PWA behavior, use a production build:

```sh
npm run build
npm run preview
```

Open it online once before testing offline. Browser profiles and different origins
have separate data; export a backup before moving between them.

## Cloud sync and deployment ☁️

The frontend runs on **Vercel**; **Supabase** provides authentication and PostgreSQL.
There is no separate Node backend.

For local cloud setup, copy `.env.example` to `.env.local`. For deployment, set
these public variables in Vercel’s **Production** environment:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Use the exact `VITE_*` names. Keep database passwords and service-role keys private.
Configure Google/GitHub providers and redirects in Supabase, and apply database
migrations separately. See the [setup guide](docs/local-development.md).

**Deployment flow:** push to `main` → code, browser and database checks pass → deploy.
Automatic Vercel Git deployments and PR previews are disabled. Add GitHub Actions
secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` before using this flow.

Online sign-in copies missing local history into your account without deleting the
original data. Sync runs while the app is open and online. Conflicts need review;
a local save does not mean it has reached the cloud.

## Development

React + TypeScript + Vite + Tailwind + Dexie/IndexedDB + Recharts.
All UI persistence goes through `WorkoutRepository`. Categories and exercise presets
currently live in code; the shared database catalog is still a proposed design.

```sh
npm run lint          # ESLint
npm run typecheck     # TypeScript: tsc -b
npm test              # Unit and integration tests
npm run build         # Production build
npm run test:e2e      # Playwright; install Chromium first
npm run test:db       # Requires local Supabase and Docker/Colima
```

## Documentation

- [Setup and recovery](docs/local-development.md)
- [Product requirements](docs/product-requirements.md) and [open work](docs/todo.md)
- [Agent guide](AGENTS.md), [development guide](docs/agent-development.md) and [glossary](docs/glossary.md)
- [Dashboard behavior](docs/activity-overview.md) and [storage decisions](docs/storage-architecture-decision.md)

## License

Copyright © 2026 pradeep. Licensed under [Apache 2.0](LICENSE).
Third-party dependencies retain their own licenses.
