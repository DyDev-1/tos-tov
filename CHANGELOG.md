# Changelog

## 0.0.1 (2026-11-17), the first release

All 11 MVP features from `claude.md`, on Next.js, Clerk, PostgreSQL + PostGIS (Supabase) and Cloudflare R2.
See `docs/mvp-checklist.md` for where each one lives.

### What visitors get

- Browse places by province and category, filter by best month, search by name in Khmer or English.
- Place page: photos, facts (fees, what to bring, how to get there), a 12-month season strip, a map with
  "Open in Google Maps", local tours and guides (contact only), likes, saves, comments, people's experiences
  with an average rating, and a report button.
- Map view with filters, a results list and a card with directions.
- Share your experience (rating, story, photos): pick an existing place or add a new one, then share to Facebook,
  Telegram, copy the link or use the phone's share sheet.
- Sign up and log in with Clerk. Saved places. Khmer and English on every screen, mobile first.

### For the team

- Admin area: approve or hide places, experiences and comments; edit places, guides and photos; merge duplicate places;
  handle reports; manage categories; ban people; mark people as trusted; a log of everything admins do.
- Release stages 1 to 4 (`RELEASE_STAGE`): the same code launches as "admin-posted places only" and opens up step by step.
- A spreadsheet importer for the first 100 to 200 places (`npm run db:import`).
- `GET /api/v1/health` shows the live version and whether the database is up.

### Safety

- Every API input is checked with Zod. Admin pages and routes check the role on the server (tests check every one).
- Supabase's public API is closed: row-level security on every table. `npm run db:check` verifies it.
- Posting, commenting and adding places are rate limited. Photos: images only, 10 MB, 10 per post, resized to WebP.
- Banned people cannot write. Security headers on every page.

### How it is built and shipped

- One branch per feature, a pull request template with the claude.md checklist.
- CI on every pull request: lint, type check, tests, build, browser tests on phone and desktop.
- Merge to `main` deploys to staging; production waits for a person to approve. A smoke test checks each deploy.
- About 700 automatic tests (unit, database, component and browser).

### Known gaps (on purpose, or still to do)

- "Users add photos to an existing place" and "suggested edits" (named in release stage 2) are not in the MVP list, so not built.
- Khmer wording needs a native speaker's review. Clerk has no Khmer translation: only its main labels are translated.
- Not tried against the real services yet: a Clerk login in the browser tests (a pretend login is used), photo uploads to
  a real R2 bucket, the Vercel and GitHub deploy jobs (they stay off until set up, see `docs/deploy.md`).
- Admins are made by a line of SQL (see the README). Deleting a photo removes it from the site but not the file in R2.
- The sample places, their coordinates and the demo guides are placeholders: replace them with real, checked data.
- No Content-Security-Policy yet (Clerk and the map tiles need a careful allow-list).
