# TosTov

Community platform for discovering and sharing places to explore in Cambodia.
See `claude.md` for the product rules and `uxui.md` for the design.

## Tech stack

Next.js (App Router) + TypeScript · Clerk · PostgreSQL + PostGIS + Drizzle on Supabase ·
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

## Supabase (staging and production)

Supabase hosts our PostgreSQL database and nothing else. Login stays with Clerk and photos stay in
Cloudflare R2, so we never use Supabase Auth, Storage or its public API.
Local development, tests and CI all use the Docker database (`npm run db:up`), which is the same
PostgreSQL + PostGIS.

Do these steps once for **staging** and once for **production** (two separate Supabase projects):

1. **Create the project** at supabase.com. Pick the region closest to your visitors (Singapore). Choose a
   long database password and keep it in a password manager. Do not paste it into chat or into git.
2. **Turn on PostGIS first.** Dashboard > Database > Extensions > search `postgis` > enable it, and choose
   the schema **`extensions`** (not `public`). Do this before running the migrations.
3. **Copy the two connection addresses** from Project Settings > Database > Connection string:
   - **Transaction pooler** (port 6543) is `DATABASE_URL`. The running app uses it.
   - **Direct connection** (port 5432) is `DIRECT_URL`. Migrations and scripts use it. If your network has
     no IPv6, use the **Session pooler** address (port 5432) instead.
4. **Keep them out of git.** On your computer, put them in a private file such as `.env.staging` (git
   ignores every `.env*` file except `.env.example`). On the host (for example Vercel), add them under
   Environment Variables.
5. **Create the tables:** `ENV_FILE=.env.staging npm run db:migrate`
6. **Add the starting data:**
   - Provinces and categories, on every database: `ENV_FILE=.env.staging npm run db:seed:reference`
   - Demo places, **staging only**: `ENV_FILE=.env.staging npm run db:seed -- --with-samples`.
     The seed script refuses to add demo places to a hosted database without that flag.
7. **Check it:** `ENV_FILE=.env.staging npm run db:check`. Every line should say `OK`.
8. **Extra safety (optional):** Project Settings > Data API > turn the Data API off. The app does not use it.

What the migrations do for Supabase: they switch on **row-level security** for every table and take the
table rights away from Supabase's `anon` and `authenticated` roles. So even if someone found your public
API key, they would see no rows. The app connects as the database owner, which is not affected.
`npm run db:check` verifies this, and a test fails if a new table forgets row-level security.

## Loading the real places (stage 1 needs 100 to 200)

Fill a spreadsheet with the places and load them all at once, checked row by row, all or nothing:

```bash
npm run db:import -- data/places.csv --dry-run      # check only
npm run db:import -- data/places.csv --admin-email=you@example.com
```

`data/README.md` explains every column and shows how to prepare the file. `data/places.template.csv` is the empty
spreadsheet to start from.

## Release stages

The same code runs in every stage (claude.md, "Release stages"). One setting decides what is open to the public.
Set `RELEASE_STAGE` in the host's environment and redeploy to move to the next stage.

| Stage | What is open |
| --- | --- |
| **1** | Admin-posted places only. Visitors browse, search, use the map, like, save and report. |
| **2** | Also comments. |
| **3** | Also sharing posts and adding places. They wait for an admin to approve them. |
| **4** | Also **trusted people** publish places and posts at once (an admin marks a person as trusted under Admin > People). |

- **Admins can always do everything**, in every stage. That is how the first 100 to 200 places get added in stage 1.
- If `RELEASE_STAGE` is empty, **production runs stage 1** (the safest) and development, tests and CI run stage 4.
- `GET /api/v1/features` tells you the stage and what is open. The server refuses closed features with
  `403 feature_closed`, and the screens hide them. A banned person cannot write in any stage.
- Not built, on purpose: "users add photos" and "suggested edits" from stage 2. They are not in the MVP list.

## Admin

Admins see an **Admin** link in the header. To make someone an admin, set their `role` to `admin` in the
database (there is deliberately no screen for it):

```sql
update users set role = 'admin' where email = 'you@example.com';
```

The person must have logged in once first, so their row exists. Admin pages are under `/admin` and the
API under `/api/v1/admin/...`. Every admin page and route checks the role on the server, and every change
is written to the activity log.

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
| `npm run test:e2e` | Browser tests (Playwright; run `npm run build` first). Starts the app twice: at stage 4 and at stage 1 |
| `npm run db:up` | Start PostgreSQL + PostGIS in Docker |
| `npm run db:generate` | Create a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Add provinces, categories and sample places (local only; safe to run again) |
| `npm run db:seed:reference` | Add provinces and categories only (safe for any database) |
| `npm run db:import -- file.csv` | Load places from a spreadsheet or JSON file (see `data/README.md`) |
| `npm run db:check` | Check PostGIS, row-level security and migrations of the database in `DIRECT_URL` |
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
