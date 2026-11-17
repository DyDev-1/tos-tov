# MVP checklist for version 0.0.1

Every item of the MVP list in `claude.md`, where it lives in the code, and which tests protect it.
A test (`tests/unit/mvp-features.test.ts`) fails if a file named here does not exist, so this page cannot go out of date.

## The 11 MVP features

| # | Feature | Where it is | Tests |
| --- | --- | --- | --- |
| 1 | Browse places by province and category | `src/components/home/province-picker.tsx`, `src/components/home/category-chips.tsx`, `src/app/[locale]/provinces/page.tsx`, `src/app/[locale]/map/page.tsx`, `src/app/api/v1/provinces/route.ts`, `src/app/api/v1/categories/route.ts` | `tests/integration/reference-api.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/map.spec.ts` |
| 2 | Filter by best season or month | `src/components/home/search-bar.tsx`, `src/components/map/map-filters.tsx`, `src/lib/services/places.ts` | `tests/integration/places-service.test.ts`, `tests/e2e/map.spec.ts` |
| 3 | Place page: details, map, photos, user posts, average rating | `src/app/[locale]/places/[slug]/page.tsx`, `src/components/place/getting-there.tsx`, `src/components/posts/posts-section.tsx`, `src/lib/services/posts.ts` | `tests/e2e/place.spec.ts`, `tests/integration/posts.test.ts`, `tests/components/posts-section.test.tsx` |
| 4 | Map view of all places, with "Open in Google Maps" | `src/app/[locale]/map/page.tsx`, `src/components/map/map-explorer.tsx`, `src/components/place/getting-there.tsx` | `tests/e2e/map.spec.ts`, `tests/e2e/place.spec.ts` |
| 5 | Search by name, Khmer and English | `src/components/home/search-bar.tsx`, `src/lib/services/places.ts`, `src/components/share/place-picker.tsx` | `tests/integration/places-service.test.ts`, `tests/e2e/home.spec.ts` |
| 6 | Sign up and login | `src/app/[locale]/sign-up/[[...sign-up]]/page.tsx`, `src/app/[locale]/sign-in/[[...sign-in]]/page.tsx`, `src/proxy.ts` | `tests/e2e/auth.spec.ts` |
| 7 | Share a post to Facebook, Telegram and this site (pick a place or add a new one) | `src/app/[locale]/share/page.tsx`, `src/components/share/share-post-form.tsx`, `src/components/share/share-menu.tsx`, `src/components/share/place-picker.tsx`, `src/app/[locale]/add-place/page.tsx`, `src/app/api/v1/places/[slug]/posts/route.ts` | `tests/components/share-post-form.test.tsx`, `tests/components/share-menu.test.tsx`, `tests/components/add-place-form.test.tsx`, `tests/integration/add-place.test.ts`, `tests/e2e/share.spec.ts` |
| 8 | Like, save, comment | `src/app/api/v1/places/[slug]/like/route.ts`, `src/app/api/v1/places/[slug]/save/route.ts`, `src/app/api/v1/places/[slug]/comments/route.ts`, `src/app/[locale]/saved/page.tsx` | `tests/integration/engagement-service.test.ts`, `tests/integration/engagement-api.test.ts` |
| 9 | Local tours and guides, contact only | `src/components/place/guides-card.tsx`, `src/components/admin/guide-manager.tsx` | `tests/e2e/place.spec.ts`, `tests/components/admin.test.tsx` |
| 10 | Khmer and English interface | `messages/en.json`, `messages/km.json`, `src/i18n/routing.ts`, `src/components/shell/language-toggle.tsx` | `tests/unit/messages.test.ts`, `tests/e2e/shell.spec.ts` |
| 11 | Admin: reports, edit/hide/merge places, ban users, manage categories | `src/lib/services/admin.ts`, `src/app/[locale]/admin/page.tsx`, `src/app/[locale]/admin/places/[id]/page.tsx`, `src/app/[locale]/admin/reports/page.tsx`, `src/app/[locale]/admin/categories/page.tsx`, `src/app/[locale]/admin/users/page.tsx`, `src/app/[locale]/admin/log/page.tsx`, `src/app/api/v1/admin/places/[id]/merge/route.ts`, `src/app/api/v1/admin/users/[id]/ban/route.ts` | `tests/integration/admin-service.test.ts`, `tests/integration/admin-api.test.ts`, `tests/components/admin.test.tsx`, `tests/e2e/admin.spec.ts` |

## The rules in claude.md

| Rule | How it is kept | Tests |
| --- | --- | --- |
| Place vs Post: one place, many posts; category and province belong to the place | `src/db/schema.ts` (`places`, `posts`) | `tests/integration/posts.test.ts` |
| Search existing places before creating one (by name and by pin) | `src/components/add-place/similar-places.tsx`, `src/lib/services/place-submissions.ts` | `tests/integration/add-place.test.ts` |
| Layers: route, then service, then database | `src/lib/services/`, `src/app/api/v1/` | the integration tests call the same services as the routes |
| Public API under `/api/v1`, admin API under `/api/v1/admin`, both use the same services | `src/lib/admin-route.ts` | `tests/integration/admin-api.test.ts` |
| Mobile-ready: everything is a Route Handler, not a Server Action | `src/app/api/v1/` (there are no Server Actions) | `tests/unit/mvp-features.test.ts` |
| Never return raw database objects | public and admin shapes in `src/lib/validation/` | the shape tests in `tests/integration/` |
| Validate all input on the server with Zod | `src/lib/validation/` | `tests/unit/place-input.test.ts`, `tests/unit/validation.test.ts` |
| Check the role on the server for every admin page and route | `src/lib/admin-guard.ts`, `src/lib/admin-page.ts` | `tests/unit/admin-pages-guard.test.ts`, `tests/integration/admin-api.test.ts` (every route) |
| Use an auth library, never custom passwords | Clerk (`src/proxy.ts`, `src/lib/auth.ts`) | `tests/e2e/auth.spec.ts` |
| Secrets only in environment variables | `.env.example`, `.github/workflows/ci.yml` | `tests/unit/ci-workflow.test.ts` |
| Uploads: images only, max 10 MB, max 10 per post, resized to WebP | `src/lib/r2.ts`, `src/lib/images.ts`, `src/lib/uploads-shared.ts` | `tests/unit/r2.test.ts`, `tests/unit/place-input.test.ts`, `tests/integration/add-place.test.ts` |
| Rate limit posting and commenting (login is rate limited by Clerk) | `src/lib/services/engagement.ts`, `src/lib/services/posts.ts`, `src/lib/services/place-submissions.ts` | `tests/integration/engagement-service.test.ts`, `tests/integration/posts.test.ts` |
| Log admin actions | `src/db/schema.ts` (`admin_actions`), `src/lib/services/admin.ts` | `tests/integration/admin-service.test.ts` |
| Mobile first; slow connections; loading, empty and error states | `src/app/[locale]/places/[slug]/loading.tsx`, `src/app/[locale]/map/loading.tsx`, `src/app/[locale]/saved/loading.tsx`, `src/app/[locale]/error.tsx`, `src/app/[locale]/not-found.tsx` | `tests/e2e/` (phone and desktop) |
| No hard-coded text; Khmer and English everywhere | `messages/` | `tests/unit/messages.test.ts`, strict component tests |
| Release stages 1 to 4 | `src/lib/release-stage.ts` | `tests/unit/release-stage.test.ts`, `tests/integration/release-stage.test.ts`, `tests/e2e/stage1/stage1.spec.ts` |
| One branch per feature; CI on every pull request; staging on merge; production needs approval | `.github/workflows/ci.yml`, `docs/deploy.md` | `tests/unit/ci-workflow.test.ts` |

## Database

`src/db/schema.ts` and `drizzle/`: provinces, categories, users, places, photos, guides, posts, likes, saves, comments,
reports and admin actions. PostGIS holds the map pin. Supabase hosts it: row-level security is on for every table
(`tests/integration/database-security.test.ts`), and `npm run db:check` verifies a live database.
