# Project: TosTov — community travel platform for Cambodia

## What we are building

A community platform where Cambodians and foreign travellers discover and
share places to explore in Cambodia, with detailed information: requirements,
best season, province, and how to get there on a map.

## Users

- Visitors: find places and the details needed to go there.
- Contributors: logged-in users who share posts about places they visited.
- Admin: moderates content, manages places, categories and users.

## Core design rule: Place vs Post

- A Place exists once (e.g. "Bou Sra Waterfall"). It holds the facts: name,
  province, category, map pin, entry fee, best months, how to get there.
- A Post is one user's experience of a place: photos, story, tips, rating,
  date visited. One place has many posts.
- Category and province belong to the Place. Posts inherit them.
- When a user shares, search existing places first (by name and by nearby
  map pin). Create a new Place only if none matches.

## MVP features

1. Browse places by province and category
2. Filter by best season or month
3. Place page: details, map, photos, user posts, average rating
4. Map view of all places, with "open in Google Maps" for directions
5. Search by name (Khmer and English)
6. Sign up and login
7. Share a post to some social platform like facebook, telegram and also in this project (select an existing place, or add a new one)
8. Like, save, comment
9. Local tours and guides listed on the place page (contact only)
10. Khmer and English interface
11. Admin: reports, edit/hide/merge places, ban users, manage categories

Out of scope for now: booking and payments, chat, following users,
notifications, mobile app, AI recommendations, ads.

## Release stages

1. Admin-posted places only (seed 100–200 places)
2. Users add photos, comments and suggested edits to existing places
3. Users share posts and new places, with admin approval
4. Trusted users publish without approval

## Tech stack

- Next.js (App Router) + TypeScript
- Auth: Clerk
- PostgreSQL + Drizzle, with PostGIS for location queries
- Tailwind CSS + shadcn/ui
- Maps: Leaflet or MapLibre with OpenStreetMap tiles. Use an
  "open in Google Maps" link for directions.
- Validation: Zod for every API input, shared with the frontend types.
- Languages: next-intl, Khmer (km) and English (en). No hard-coded
  text in components.
- Image storage: Cloudflare R2 (store only URLs in the database)
- Tests: Vitest (unit/integration), Playwright (end to end)
- CI/CD: GitHub Actions

## Architecture rules

- Layers: route → service → database. Business logic lives in
  lib/services, never in page components.
- Public API under /api/v1/..., admin API under /api/v1/admin/...
  Both call the same services.
- Anything a future mobile app needs must be a Route Handler,
  not a Server Action.
- Never return raw database objects. Map them to public or admin shapes.
- Validate all input on the server with Zod.

## Data model

User(id, name, email, role: user|admin)
Place(id, name, provinceId, categoryId, location, entryFee, bestMonths,
status, createdById, parentPlaceId?)
Post(id, placeId, userId, story, rating, visitedAt, status)
Photo(id, postId, url)
Category(id, nameKm, nameEn) Province(id, nameKm, nameEn)
Comment, Like, Save, Report

## Security rules

- Check the user's role on the server for every admin page and route.
- Use an auth library; never write custom password handling.
- Secrets only in environment variables, never in git.
- Uploads: images only, max 10 MB each, max 10 per post; resize to WebP.
- Rate limit login, posting and commenting.
- Log admin actions.

## UX rules

- Mobile first; design for slow connections (compressed, lazy-loaded images).
- Every screen has loading, empty and error states.
- follow ui folder png
- All uxui follow uxui.md
- All text must support Khmer and English.

## How to work with me

- I am learning full-stack development. Explain in simple English,
  step by step, and explain why, not only what.
- Before writing code, show a short plan and wait for my approval.
- Build one small vertical slice at a time: database → API → UI → tests.
- Follow the rules above. If a request conflicts with them, tell me first.
- Write tests for business logic and for each API route.
- Do not add features outside the MVP list unless I ask.
- When there are several options, recommend one and say why.

## Workflow

- One branch per feature, small commits, pull request to main.
- CI on every pull request: lint → type check → tests → build.
- Merge to main deploys to staging; production needs manual approval.
