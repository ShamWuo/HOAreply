# Suggested Commands (PowerShell)
- `npm run dev` – Launch Next.js dev server at http://localhost:3000.
- `npm run build` / `npm run start` – Production build + serve (build also validates env vars).
- `npm run lint` – ESLint (Next core-web-vitals config).
- `npm run prisma:generate` – Regenerate Prisma client (post schema edits or after install).
- `npm run prisma:migrate` – Apply/create database migrations in dev.
- `npm run prisma:studio` – Open Prisma Studio GUI.
- `npm run prisma:seed` – Seed demo data via `prisma/seed.ts`.
- **Common PowerShell helpers**: `Get-ChildItem` (list files), `Set-Location <path>` (cd), `Get-Content <file>` (view file), `New-Item -ItemType File|Directory` (create), `Remove-Item <target>` (delete). Chain commands with `;` instead of `&&`.