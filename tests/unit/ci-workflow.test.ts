import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

// claude.md: "CI on every pull request: lint -> type check -> tests -> build.
// Merge to main deploys to staging; production needs manual approval."
// These tests read the workflow file and fail if someone changes it in a way that breaks that promise.

type Step = { name?: string; run?: string; uses?: string; env?: Record<string, string>; if?: string; id?: string };
type Job = { needs?: string | string[]; if?: string; environment?: string | { name: string; url?: string }; steps: Step[]; env?: Record<string, string>; services?: unknown; concurrency?: { group: string; "cancel-in-progress": boolean } };
const raw = readFileSync(".github/workflows/ci.yml", "utf8");
const workflow = parse(raw) as { on: Record<string, unknown>; permissions: Record<string, string>; concurrency: unknown; jobs: Record<string, Job> };
const jobs = workflow.jobs;
const runs = (job: Job) => job.steps.map((s) => s.run ?? "");
// Where a command sits in the job: step number first, then its place inside that step
// (two commands can share one multi-line step).
const indexOfStep = (job: Job, text: string) => {
  const step = runs(job).findIndex((r) => r.includes(text));
  return step === -1 ? -1 : step * 1000 + runs(job)[step].indexOf(text);
};

describe("the workflow runs when it should", () => {
  it("runs on every pull request and on pushes to main only", () => {
    expect(Object.keys(workflow.on).sort()).toEqual(["pull_request", "push"]);
    expect((workflow.on.push as { branches: string[] }).branches).toEqual(["main"]);
  });

  it("only reads the repository by default", () => {
    expect(workflow.permissions).toEqual({ contents: "read" });
  });
});

describe("job 'check' (every pull request)", () => {
  const check = jobs.check;

  it("runs lint, then type check, then tests, then build, in that order", () => {
    const order = ["npm run lint", "npm run typecheck", "npm test", "npm run build"].map((cmd) => indexOfStep(check, cmd));
    expect(order.every((i) => i >= 0), "all four steps exist").toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("migrates and checks the database before the tests", () => {
    const migrate = indexOfStep(check, "db:migrate");
    expect(migrate).toBeGreaterThanOrEqual(0);
    expect(indexOfStep(check, "db:check")).toBeGreaterThan(migrate);
    expect(migrate).toBeLessThan(indexOfStep(check, "npm test"));
  });

  it("runs the browser tests after the build", () => {
    expect(indexOfStep(check, "test:e2e")).toBeGreaterThan(indexOfStep(check, "npm run build"));
  });

  it("has a PostGIS database for the tests", () => {
    expect(JSON.stringify(check.services)).toContain("postgis/postgis");
  });

  it("is not skipped by a condition", () => {
    expect(check.if).toBeUndefined();
  });
});

describe("deploying", () => {
  const staging = jobs["deploy-staging"];
  const production = jobs["deploy-production"];

  it("staging waits for the checks, and only deploys main after a merge", () => {
    expect(staging.needs).toBe("check");
    expect(staging.if).toContain("github.event_name == 'push'");
    expect(staging.if).toContain("refs/heads/main");
  });

  it("production waits for staging, and only deploys main after a merge", () => {
    expect(production.needs).toBe("deploy-staging");
    expect(production.if).toContain("github.event_name == 'push'");
    expect(production.if).toContain("refs/heads/main");
  });

  it("pull requests never deploy (they only run the checks)", () => {
    for (const job of [staging, production]) expect(job.if).toContain("github.event_name == 'push'");
  });

  it("production uses the 'production' environment (which has required reviewers = manual approval)", () => {
    expect(typeof production.environment === "object" ? production.environment.name : production.environment).toBe("production");
    expect(typeof staging.environment === "object" ? staging.environment.name : staging.environment).toBe("staging");
  });

  it("both deploys are off until DEPLOY_ENABLED is set", () => {
    for (const job of [staging, production]) expect(job.if).toContain("vars.DEPLOY_ENABLED == 'true'");
  });

  it("updates the database and checks it before deploying, then smoke-tests after", () => {
    for (const job of [staging, production]) {
      const migrate = indexOfStep(job, "db:migrate");
      const deploy = indexOfStep(job, "vercel deploy");
      const smoke = indexOfStep(job, "npm run smoke");
      expect(migrate).toBeGreaterThanOrEqual(0);
      expect(indexOfStep(job, "db:check")).toBeGreaterThan(migrate);
      expect(deploy).toBeGreaterThan(migrate);
      expect(smoke).toBeGreaterThan(deploy);
    }
  });

  it("a deploy is never cut off halfway by a newer one", () => {
    for (const job of [staging, production]) expect(job.concurrency?.["cancel-in-progress"]).toBe(false);
  });

  it("staging and production use different Vercel projects", () => {
    expect(staging.env?.VERCEL_PROJECT_ID).toContain("VERCEL_STAGING_PROJECT_ID");
    expect(production.env?.VERCEL_PROJECT_ID).toContain("VERCEL_PRODUCTION_PROJECT_ID");
  });

  it("reads each database address from the environment's own secret", () => {
    for (const job of [staging, production]) expect(job.env?.DIRECT_URL).toBe("${{ secrets.DIRECT_URL }}");
  });
});

describe("secrets", () => {
  it("never writes a real key or password in the file", () => {
    expect(raw).not.toMatch(/sk_(test|live)_[A-Za-z0-9]{8,}/);
    expect(raw).not.toMatch(/pk_(test|live)_[A-Za-z0-9]{8,}/);
    expect(raw).not.toMatch(/postgres(ql)?:\/\/[^\s"']+:[^\s"'@$]{3,}@(?!localhost)/);
  });

  it("gives secrets to jobs only through the secrets context", () => {
    for (const match of raw.matchAll(/\$\{\{\s*secrets\.(\w+)\s*\}\}/g)) expect(match[1]).toMatch(/^[A-Z_]+$/);
  });
});

describe("the tools the workflow calls exist", () => {
  const scripts = (JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;
  it.each(["lint", "typecheck", "test", "build", "test:e2e", "db:migrate", "db:check", "db:seed", "smoke"])("npm run %s", (name) => {
    expect(scripts[name], name).toBeTruthy();
  });
});

describe("the pull request template and the docs", () => {
  it("mention the rules from claude.md", () => {
    const template = readFileSync(".github/pull_request_template.md", "utf8");
    for (const rule of ["Zod", "role on the server", "km.json", "No secrets in git"]) expect(template).toContain(rule);
  });

  it("the deploy guide covers staging, production approval and the migration rule", () => {
    const guide = readFileSync("docs/deploy.md", "utf8");
    for (const word of ["staging", "Required reviewers", "DEPLOY_ENABLED", "Database changes must be safe", "smoke"]) expect(guide).toContain(word);
  });
});
