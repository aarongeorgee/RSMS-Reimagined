# Final Cloudflare deployment

The project contains separate frontend and API deployments.

## API Worker

```bash
pnpm wrangler secret put JWT_SECRET --config wrangler.api.jsonc
pnpm wrangler d1 execute rsms-db --remote --file=./migrations/0002_password_reset_tokens.sql
pnpm run deploy:api
```

The API remains at `https://rsms-reimagined.aarongeorge186.workers.dev`.

## Frontend

`.env.production` already points the frontend at the live API. Build and deploy with:

```bash
pnpm build
pnpm run deploy:web
```

For Git-connected Cloudflare builds use:

- Build command: `pnpm run build`
- Deploy command: `pnpm run deploy:web`
- Project name: `rsms-reimagined-web`

## Security changes

- 5-minute idle session timeout
- password reset codes expire after 15 minutes and are one-time use
- demo `.local` accounts display the generated code because no email provider is connected
- production API URL never falls back to port 5001 on a public host
