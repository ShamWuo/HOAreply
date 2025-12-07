# Deployment & Production Checklist

Use this guide when preparing HOA Reply AI Connect for production.

## Required environment variables
Create a `.env` (or set envs in your host) with these variables. Do NOT commit real values.

- `DATABASE_URL` — PostgreSQL connection string (use TLS).
- `NEXTAUTH_SECRET` — strong random secret (e.g. `openssl rand -base64 32`).
- `NEXTAUTH_URL` — your app URL (https://your-domain.com).
- `APP_BASE_URL` — same as `NEXTAUTH_URL` (used to build absolute links).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials.
- `GOOGLE_OAUTH_REDIRECT_URI` — `https://<your-domain>/api/auth/google/callback`.
- `GMAIL_POLL_INTERVAL_MINUTES` — integer, suggested `2` (used by job logic).
- `CRON_SECRET` — optional shared secret for `/api/jobs/poll-gmail`.
- `OPENAI_API_KEY` — optional, used for AI classification/drafts.

## Quick Production Steps

1. Configure the above envs in your hosting provider (Vercel, Render, Fly, etc.) or in your CI pipeline/secrets manager.
2. Ensure Google Cloud OAuth credentials include `https://<your-domain>/api/auth/google/callback` in the authorized redirect URIs.
3. Run database migrations as part of deployment:

```bash
# In CI or on the host
npx prisma migrate deploy
npm run prisma:generate
```

4. Build the app for production:

```bash
npm run build
npm start
```

Make sure `NODE_ENV=production` is set by your host.

## Scheduling Gmail Polling

The job handler is `POST /api/jobs/poll-gmail`. For automated polling:

- Use a scheduler (GitHub Actions, provider cron, Uptime Robot) to POST the endpoint.
- If you set `CRON_SECRET`, include header `x-cron-secret: <CRON_SECRET>` for authentication.
- A database-backed mutex prevents overlapping runs across app instances. When the endpoint responds with HTTP 202 and `{ "skipped": true }`, another poll is already running—treat it as a soft success and let the next schedule fire normally.

Example GitHub Actions job (simple):

```yaml
name: Poll Gmail (daily)

on:
  schedule:
    - cron: '*/5 * * * *' # every 5 minutes (adjust as needed)

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - name: Poll Gmail endpoint
        run: |
          curl -X POST "${{ secrets.APP_BASE_URL }}/api/jobs/poll-gmail" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
        env:
          APP_BASE_URL: ${{ secrets.APP_BASE_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

## Security & Ops Recommendations

- Serve over HTTPS (managed TLS via host). Ensure any reverse proxy sets `X-Forwarded-*` headers.
- Use a secrets manager (e.g., Vercel Environment Variables, GitHub Actions Secrets, AWS Secrets Manager) — avoid storing secrets in repo or config files.
- Rotate credentials if you suspect leakage. Use limited-permission DB users.
- Add structured logging and monitoring (Sentry, Datadog, etc.) before production traffic.
- Consider running background workers or a dedicated scheduler for polling instead of relying on in-app HTTP cron triggers.
- Monitor `GET /api/health` in your uptime checks; it verifies Prisma can reach the database and returns HTTP 500 if dependencies are down.

## Optional: CI snippet
If you want, I can add a GitHub Actions workflow that:
- Runs `npm ci`
- Runs `npx prisma migrate deploy` and `npm run prisma:generate`
- Builds the app (`npm run build`)
- (Optional) deploys to Vercel or another host

Tell me if you want me to add that workflow and/or commit the `deploy.md` into a specific location or format.
