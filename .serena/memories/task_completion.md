# Task Completion Checklist
1. **Lint & Build**: Run `npm run lint` and `npm run build` before handing off changes (build will also flag missing env vars).
2. **Database Changes**: If Prisma schema/migrations changed, run `npm run prisma:generate` + `npm run prisma:migrate` (document any manual DB steps) and mention in summary.
3. **Manual Verification**: Smoke-test key flows locally (landing, auth, dashboard/HOA pages) when relevant, noting any untested areas.
4. **Summary Expectations**: Reference touched files/sections explicitly, describe behavior/risk impacts, and call out follow-up work or testing gaps.
5. **Environment Notes**: Mention if `.env` adjustments are required for the change. Highlight any new secrets or redirect URIs.
6. **No Automated Tests Yet**: Call out when functionality lacks test coverage and suggest high-value tests where applicable.