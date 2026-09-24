# RSMS Reimagined — Deployment

## Supported environments
- macOS, Windows and Linux development machines with Node.js 22.13+
- Current Chromium, Firefox and Safari browsers
- Responsive mobile/tablet browsers
- Docker-compatible hosts

## Local development
```bash
pnpm install --frozen-lockfile
pnpm dev:full
```
Frontend: http://localhost:5173  
API: http://localhost:5001/api

## Production-style local build
```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```
Web: http://localhost:8787  
API: http://localhost:5001/api

## Docker
```bash
docker compose up --build -d
```
Then open http://localhost:8787.

## Environment
Copy `.env.example` to `.env` when overrides are required. Set `CLIENT_ORIGIN` to the public web origin for a locked-down deployment and `NEXT_PUBLIC_API_URL` when the API is served from a different public origin.

## Operational checks
- `GET /api/health` returns API health.
- Profile → Preferences shows API sync status and build version.
- Profile → Preferences → Reset demo data restores the packaged demo dataset.
- PWA cache uses a versioned network-first strategy so stale UI does not hide new releases.

## Important production note
This is an academic demonstration system. Before handling real institutional or student records, replace demo authentication with an institutional identity provider, use TLS/HTTPS, move secrets out of source, add server-side audit logging, authorization review, backups, rate limiting and a production database strategy.
