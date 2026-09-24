# RSMS Express API

Local backend used by the RSMS Reimagined evaluation project.

## Run

```sh
pnpm api:dev
```

API: `http://localhost:5001`

## Generic demo accounts

Student mode:

```text
Email: demo@rsms.local
Password: demo123
```

Faculty demo mode:

```text
Email: faculty@rsms.local
Password: demo123
```

No real credentials or student identities are stored.

## What the backend demonstrates

- Express routing and JSON middleware
- local-development CORS
- JWT authentication and role checks
- SQLite persistence via Node's `node:sqlite`
- timetable/calendar queries
- daily timetable overrides
- extra-class creation
- attendance entry CRUD
- attendance aggregation and eligibility calculations
- leave-impact projection
- request CRUD and profile update

The SQLite file is created at `backend/runtime/rsms.sqlite` and is excluded from the final ZIP. Use `pnpm db:reset` to rebuild it from `data/*.json`.
