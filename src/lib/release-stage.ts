// Release stages (claude.md). The same code runs in every stage; one setting decides what is open:
//   1  Admin-posted places only (the first launch, with 100 to 200 seeded places)
//   2  People can also comment
//   3  People can also share posts and add new places, with admin approval
//   4  Trusted people publish without approval
// Set RELEASE_STAGE (1 to 4) in the environment and redeploy. Admins can always do everything.
// Plain functions with no server-only code, so the browser, the API and the tests all share them.

export type ReleaseStage = 1 | 2 | 3 | 4;
export const RELEASE_STAGES: readonly ReleaseStage[] = [1, 2, 3, 4];

// Likes, saves and "report a problem" cost nothing to moderate, so they open from stage 1.
// (claude.md also lists "photos and suggested edits" in stage 2. Neither is in the MVP list, so they are not built.)
export const CAPABILITY_STAGE = {
  like: 1,
  save: 1,
  report: 1,
  comment: 2,
  sharePost: 3,
  addPlace: 3,
} as const satisfies Record<string, ReleaseStage>;
export type Capability = keyof typeof CAPABILITY_STAGE;

type Env = Record<string, string | undefined>;

// Production defaults to stage 1 (the safest, if someone forgets to set it). Development, tests and CI
// default to 4, so every feature can be tried.
export function getReleaseStage(env: Env = process.env): ReleaseStage {
  const raw = Number(env.RELEASE_STAGE);
  if (Number.isInteger(raw) && raw >= 1 && raw <= 4) return raw as ReleaseStage;
  return env.NODE_ENV === "production" ? 1 : 4;
}

export function stageAllows(stage: ReleaseStage, capability: Capability): boolean {
  return stage >= CAPABILITY_STAGE[capability];
}

export function capabilityMap(stage: ReleaseStage): Record<Capability, boolean> {
  return Object.fromEntries((Object.keys(CAPABILITY_STAGE) as Capability[]).map((c) => [c, stageAllows(stage, c)])) as Record<Capability, boolean>;
}

// Can this person use the feature right now? Admins always can.
export function featureAllowed(capability: Capability, user: { role: string } | null, stage: ReleaseStage = getReleaseStage()): boolean {
  if (user?.role === "admin") return true;
  return stageAllows(stage, capability);
}

// New places and posts: published at once, or waiting for an admin?
export function publishesWithoutApproval(user: { role: string; trusted: boolean }, stage: ReleaseStage = getReleaseStage()): boolean {
  return user.role === "admin" || (stage >= 4 && user.trusted);
}
