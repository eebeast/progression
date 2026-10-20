# Mission: understand and troubleshoot Progression

## Why

The user wants to understand their own deployed workout app and inspect its data.
The immediate question is why category fields can be null in Supabase while charts
still show categories. Teaching should connect visible behavior to actual storage.

## Success looks like

- Trace a logged set from the screen through local persistence and cloud sync.
- Distinguish Vercel hosting, Supabase authentication and PostgreSQL storage.
- Find a workout's exercise/session/set relationships in saved JSON.
- Explain local save versus acknowledged sync, and saved versus derived fields.

## Constraints

- Use the current code, plain language and one concrete workout example.
- Keep teaching materials isolated here; avoid duplicating project specifications.
- Teach through an offline/online simulation and immediate-feedback recall questions.
- Do not infer mastery until the user demonstrates understanding.

## Out of scope

- Implementing the proposed shared catalog, changing production data or provisioning.
- A general React, SQL or backend course unrelated to the current app.
