# HOA Reply AI Connect

HOA Reply AI Connect is a production-ready SaaS starter that lets HOA managers connect their Gmail inboxes, normalize messages, send them to an existing n8n flow, and reply directly from a unified dashboard.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- NextAuth Credentials provider + Prisma Adapter
- PostgreSQL + Prisma ORM
- Google OAuth & Gmail REST APIs
- n8n webhook integration for AI replies

## Getting Started

1. **Install dependencies**

```bash
npm install
```

2. **Set up environment variables**

Copy `.env.example` to `.env.local` (or `.env`) and fill in values from Google Cloud, n8n, and your database.

```bash
cp .env.example .env.local
```

The example file now ships with sensible localhost defaults. Update the URLs/IDs to your production values before deploying. If a value is missing or malformed, `npm run build` will fail with a detailed list of offending keys (thrown from `src/lib/env.ts`).

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Use `npx auth secret` or `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud OAuth credentials (web type) |
| `GOOGLE_OAUTH_REDIRECT_URI` | Should match `/api/auth/google/callback` |
| `N8N_WEBHOOK_URL` | Existing workflow endpoint |
| `GMAIL_POLL_INTERVAL_MINUTES` | Poll cadence suggestion (not used for scheduling yet) |
| `APP_BASE_URL` | Used when building absolute URLs |
| `CRON_SECRET` | Optional shared secret for `/api/jobs/poll-gmail` |
| `SENTRY_DSN` / `SENTRY_TRACES_SAMPLE_RATE` | Optional Sentry monitoring + trace sampling |

3. **Prisma setup**

```bash
npx prisma migrate dev
npm run prisma:generate
npm run prisma:studio # optional UI
```

To load demo data:

```bash
npm run prisma:seed
```

4. **Run the app**

```bash
npm run dev
```

Visit `http://localhost:3000` for marketing site, `/auth/signup` to create a user, and `/app/dashboard` for the authenticated app.

## Security & data retention

- Gmail access and refresh tokens are encrypted at rest with AES-256-GCM. Provide `ENCRYPTION_KEY` (base64-encoded 32-byte key, e.g., `openssl rand -base64 32`) in your environment.
- Disconnecting a Gmail account stops further ingestion. Request deletion via the in-app privacy link (`/privacy#data-deletion`) to remove stored data.

## Gmail OAuth configuration

1. Create a Google Cloud project and enable the Gmail API.
2. Create OAuth credentials (Web application).
3. Add `http://localhost:3000/api/auth/google/callback` to the authorized redirect URIs.
4. Update `.env` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and redirect URI.

## Gmail polling job

The job is implemented at `POST /api/jobs/poll-gmail`. It can be triggered in three ways:

- Manual `curl` with valid session cookies (dev use).
- Authenticated request with `x-cron-secret` header when `CRON_SECRET` is set (for GitHub Actions, UptimeRobot, etc.).
- Future background worker (code is structured so the handler only orchestrates `pollAllGmailAccounts`).

The endpoint now acquires a database-backed lock before processing mailboxes, which prevents overlapping runs across multiple instances. If a run is already in progress the API returns HTTP 202 with `skipped: true` so your scheduler can retry later instead of enqueueing duplicate send attempts.

Example scheduled request (GitHub Actions):

```yaml
- name: Poll Gmail
	run: |
		curl -X POST "${{ env.APP_BASE_URL }}/api/jobs/poll-gmail" \
			-H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
			-H "Content-Type: application/json"
```

## Project structure highlights

- `src/lib/` – Prisma client, env loader, Google/Gmail helpers, webhook caller, jobs.
- `src/components/` – UI primitives (auth forms, HOA forms, landing hero, etc.).
- `src/app/` – App Router routes (marketing, auth, dashboard, HOA pages, APIs).
- `prisma/schema.prisma` – Database schema + migrations.

## Operational endpoints

- `GET /api/health` – JSON health report (database connectivity + latency). Responses are never cached and return HTTP 500 when dependencies fail. Point your load balancer or uptime monitor here in production.

## Development notes

- All sensitive tokens are stored encrypted at rest by your database; ensure TLS is enabled in production.
- Add proper logging (e.g., pino) or monitoring before deploying.
- Replace `window.location.reload()` calls with SWR/tRPC for a smoother UX if needed.
- For production scheduling, move `pollAllGmailAccounts` into a worker/cron service.

## Testing

No automated tests are included yet. Recommended next steps:

1. Add integration tests for auth routes using Next.js `app-router` test utilities.
2. Mock Gmail/n8n APIs when testing job logic.
3. Verify Google OAuth and webhook flows in a staging environment with HTTPS.

Happy shipping!
