import { describe, expect, it } from "vitest";
import { capabilityMap, featureAllowed, getReleaseStage, publishesWithoutApproval, stageAllows } from "@/lib/release-stage";

describe("getReleaseStage", () => {
  it("reads a stage from 1 to 4", () => {
    for (const stage of [1, 2, 3, 4]) expect(getReleaseStage({ RELEASE_STAGE: String(stage) })).toBe(stage);
  });

  it("defaults to the safest stage (1) in production, and to everything open elsewhere", () => {
    expect(getReleaseStage({ NODE_ENV: "production" })).toBe(1);
    expect(getReleaseStage({ NODE_ENV: "development" })).toBe(4);
    expect(getReleaseStage({ NODE_ENV: "test" })).toBe(4);
    expect(getReleaseStage({})).toBe(4);
  });

  it.each(["0", "5", "-1", "2.5", "two", "", " "])("falls back to the default for %j", (value) => {
    expect(getReleaseStage({ RELEASE_STAGE: value, NODE_ENV: "production" })).toBe(1);
    expect(getReleaseStage({ RELEASE_STAGE: value })).toBe(4);
  });

  it("prefers the setting over the default", () => {
    expect(getReleaseStage({ RELEASE_STAGE: "2", NODE_ENV: "production" })).toBe(2);
  });
});

describe("what each stage opens", () => {
  it.each([
    [1, { like: true, save: true, report: true, comment: false, sharePost: false, addPlace: false }],
    [2, { like: true, save: true, report: true, comment: true, sharePost: false, addPlace: false }],
    [3, { like: true, save: true, report: true, comment: true, sharePost: true, addPlace: true }],
    [4, { like: true, save: true, report: true, comment: true, sharePost: true, addPlace: true }],
  ] as const)("stage %i", (stage, expected) => {
    expect(capabilityMap(stage)).toEqual(expected);
    for (const [capability, open] of Object.entries(expected)) {
      expect(stageAllows(stage, capability as keyof typeof expected)).toBe(open);
    }
  });

  it("only ever opens more as the stage grows", () => {
    const open = (stage: 1 | 2 | 3 | 4) => Object.values(capabilityMap(stage)).filter(Boolean).length;
    expect([open(1), open(2), open(3), open(4)]).toEqual([3, 4, 6, 6]);
  });
});

describe("featureAllowed", () => {
  it("lets admins do everything at every stage", () => {
    for (const stage of [1, 2, 3, 4] as const) {
      expect(featureAllowed("addPlace", { role: "admin" }, stage)).toBe(true);
      expect(featureAllowed("comment", { role: "admin" }, stage)).toBe(true);
    }
  });

  it("follows the stage for everyone else, including visitors who are not logged in", () => {
    expect(featureAllowed("comment", { role: "user" }, 1)).toBe(false);
    expect(featureAllowed("comment", { role: "user" }, 2)).toBe(true);
    expect(featureAllowed("addPlace", null, 2)).toBe(false);
    expect(featureAllowed("addPlace", null, 3)).toBe(true);
  });
});

describe("publishesWithoutApproval", () => {
  it("is true for admins at any stage", () => {
    for (const stage of [1, 2, 3, 4] as const) expect(publishesWithoutApproval({ role: "admin", trusted: false }, stage)).toBe(true);
  });
  it("is true for trusted people only at stage 4", () => {
    expect(publishesWithoutApproval({ role: "user", trusted: true }, 3)).toBe(false);
    expect(publishesWithoutApproval({ role: "user", trusted: true }, 4)).toBe(true);
  });
  it("is never true for an ordinary person", () => {
    for (const stage of [1, 2, 3, 4] as const) expect(publishesWithoutApproval({ role: "user", trusted: false }, stage)).toBe(false);
  });
});
