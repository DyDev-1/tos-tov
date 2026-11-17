# Deploying TosTov

The flow (from `claude.md`):

```
pull request ──> lint -> type check -> tests -> build   (must pass before merging)
merge to main ──> staging (automatic) ──> production (waits for a person to approve)
```

Both deploys use the same commit. The workflow is in `.github/workflows/ci.yml`. The deploy jobs stay **off** until
you finish the setup below, so the checks work from day one.

The app runs on **Vercel**, the database on **Supabase**, photos on **Cloudflare R2**, login on **Clerk**.
You need two of everything that holds data or keys: one for **staging** (a safe copy to try things) and one for **production**.

## One-time setup

### 1. Supabase (two projects)

Follow the "Supabase" steps in the README for `tostov-staging` and `tostov-production`. At the end of each, keep the
**transaction pooler** address (`DATABASE_URL`) and the **direct** address (`DIRECT_URL`).

### 2. Vercel (two projects)

1. Create two projects from the GitHub repository: `tostov-staging` and `tostov-production`.
2. In **each** project, open Settings > Git and turn **off** automatic deployments from Git (GitHub Actions deploys instead,
   after the checks pass).
3. In **each** project, add these under Settings > Environment Variables, for the **Production** environment of that project.
   Use the staging values in the staging project and the production values in the production project.

   | Name | Staging | Production |
   | --- | --- | --- |
   | `DATABASE_URL` | staging transaction pooler (port 6543) | production transaction pooler |
   | `DIRECT_URL` | staging direct address | production direct address |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk **test** keys | Clerk **live** keys |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | staging bucket | production bucket |
   | `NEXT_PUBLIC_SITE_URL` | staging address | production address (no slash at the end) |
   | `RELEASE_STAGE` | `4` (try everything) | `1` at launch, then `2`, `3`, `4` |

4. Write down, from each project's Settings > General: the **Project ID**. And from your team's settings: the **Team (org) ID**.
5. Create a token: Account Settings > Tokens > create. Keep it for the next step.

### 3. GitHub

In the repository, Settings:

1. **Environments** > New environment, create two:
   - `staging`: no extra rules. Add an **environment secret** `DIRECT_URL` = the staging direct address.
   - `production`: tick **Required reviewers** and add yourself (and anyone who may approve a release).
     Add an **environment secret** `DIRECT_URL` = the production direct address.
     This is what makes production wait for a person.
2. **Secrets and variables > Actions**:
   - Secrets: `VERCEL_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (Clerk **test** keys, for the checks).
   - Variables: `VERCEL_ORG_ID`, `VERCEL_STAGING_PROJECT_ID`, `VERCEL_PRODUCTION_PROJECT_ID`,
     `STAGING_RELEASE_STAGE` (`4`) and `PRODUCTION_RELEASE_STAGE` (`1`). The last two are optional: when set, the smoke test
     also checks that the site runs the release stage you expect.
   - Last, variable `DEPLOY_ENABLED` = `true`. This switches the deploy jobs on.
3. **Branches > Add a rule** for `main`: require a pull request before merging, require the status check
   **Lint, type check, tests, build**, and block force pushes. Now nothing reaches `main` without passing the checks.

### 4. Clerk

Staging uses a Clerk **development** instance (test keys), production a **production** instance (live keys, your real domain).
In both, turn on username, phone number and email to match the design (see the README).

## Day to day

1. Work on a branch, open a pull request. The checks run. Fix anything red.
2. Merge. Staging deploys by itself: database updated, new version live, then the **smoke test** looks at the new site.
3. Try staging. When it is good, open the run in GitHub > Actions and press **Review deployments > Approve**.
   Production gets the database update, the new version, and the same smoke test.

If the smoke test fails, the job turns red and you know straight away. To go back, redeploy the previous version from the
Vercel dashboard (Deployments > the last good one > Promote to Production).

## Database changes must be safe to go first

The database is updated **before** the new code goes live, and for a moment the old code runs on the new database.
So a migration may only **add** things: a new table, a new column that is optional or has a default.
To remove or rename something, do it in two releases: first stop using it in the code and release, then remove it in a later migration.

## Checking by hand

```bash
npm run smoke -- https://your-site.example.com               # is the site alive and safe?
EXPECT_STAGE=1 npm run smoke -- https://your-site.example.com   # ...and does it run release stage 1?
ENV_FILE=.env.staging npm run db:check                          # is the database set up correctly?
```
