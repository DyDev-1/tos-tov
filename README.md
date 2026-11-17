# TosTov

Community platform for discovering and sharing places to explore in Cambodia.
See `claude.md` for the product rules and `uxui.md` for the design.

## Tech stack

Next.js (App Router) + TypeScript · Clerk · PostgreSQL + PostGIS + Drizzle ·
Tailwind CSS + shadcn/ui · Leaflet + OpenStreetMap · Zod · next-intl (en, km) ·
Cloudflare R2 · Vitest + Playwright · GitHub Actions

## First-time setup

1. Install packages: `npm install`
2. Copy the env file: `cp .env.example .env.local`
3. Create a free Clerk app at https://dashboard.clerk.com and paste its
   publishable key and secret key into `.env.local`.
4. Start the database (needs Docker): `npm run db:up`
5. Start the app: `npm run dev`, then open http://localhost:3000

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / run it |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright; run `npm run build` first) |
| `npm run db:up` | Start PostgreSQL + PostGIS in Docker |
| `npm run db:generate` | Create a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |

## Folder layout

```
src/app/[locale]/         pages, one copy per language (/en, /km)
src/app/api/v1/           public API (Route Handlers)
src/app/api/v1/admin/     admin API (same services, admin role check)
src/lib/services/         business logic (route → service → database)
src/lib/validation/       Zod schemas shared by server and frontend
src/db/                   Drizzle schema and connection
src/i18n/                 next-intl routing and config
messages/                 en.json and km.json translations
tests/unit, tests/e2e     Vitest and Playwright tests
```
