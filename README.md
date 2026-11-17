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
5. Create the tables and add sample data: `npm run db:migrate` then `npm run db:seed`
   (25 provinces, 5 categories, 8 sample places with comments and demo guides).
6. Start the app: `npm run dev`, then open http://localhost:3000

### Clerk settings (in the Clerk dashboard)

The sign up form shows what you switch on under **Configure → User & authentication**:
turn on **username**, **phone number** and **email** to match the design. Add the Clerk **test** keys to
GitHub as repository secrets (Settings → Secrets and variables → Actions) so CI can build.

### Photo uploads (Cloudflare R2)

"Add a place" needs photo storage. Create an R2 bucket with a public address, then fill the five `R2_*`
values in `.env.local`. The bucket needs a CORS rule that allows `PUT` from your site address. Until then
the form explains that uploads are not set up yet.

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
| `npm run db:seed` | Add provinces, categories and sample places (safe to run again) |
| `npm run db:studio` | Browse the database |

## Folder layout

```
src/app/[locale]/         pages, one copy per language (/en, /km)
src/app/api/v1/           public API (Route Handlers): places, comments, likes, saves, reports, uploads
src/app/api/v1/admin/     admin API (same services, admin role check)
src/lib/services/         business logic (route → service → database)
src/lib/validation/       Zod schemas shared by server and frontend
src/db/                   Drizzle schema and connection
src/i18n/                 next-intl routing and config
messages/                 en.json and km.json translations
tests/unit, tests/integration, tests/components   Vitest (database tests use their own tostov_test database)
tests/e2e                 Playwright (browser) tests
```
