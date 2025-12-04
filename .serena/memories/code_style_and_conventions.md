# Code Style & Conventions
- **TypeScript-first**: Strict mode enabled; use modern ES modules, async/await. Server components default in `src/app`; mark client components with `"use client"`.
- **Imports**: Use `@/*` alias for anything under `src`. Group React/Next dependencies first, followed by local modules.
- **Styling**: Tailwind CSS v4 utility classes inline; favor semantic groupings (spacing, typography, color). Reuse design tokens/radii from `globals.css`; prefer rounded 24–32px, glass panels, subtle gradients, uppercase tracking labels.
- **Components**: Functional components with PascalCase files; colocate marketing pieces under `src/components/landing`, auth primitives under `src/components/auth`, etc. Keep JSX concise and extract reusable arrays (e.g., lists of cards) near the component.
- **State & Forms**: Client auth forms use React hooks + `useState`; validation handled with Zod schemas from `src/lib/validators`. Use NextAuth helpers (`signIn`, `signOut`) and `useRouter` for navigation.
- **API Routes**: App Router route handlers under `src/app/api/**/route.ts`; return `NextResponse`. Validate input (Zod) and handle Prisma errors gracefully.
- **Environment & Secrets**: Load via `src/lib/env.ts`; never hardcode secrets. Gmail + n8n helpers expect env-driven config.
- **Comments**: Keep comments minimal; add only when logic isn't immediately obvious. Use descriptive variable/array names instead.