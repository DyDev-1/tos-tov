import { describe, expect, it } from "vitest";
import { currentMonth, formatDate, monthName, timeAgo } from "@/lib/dates";

describe("currentMonth", () => {
  it("uses the month in Cambodia, not in UTC", () => {
    // 31 Oct 20:00 UTC is already 1 Nov 03:00 in Phnom Penh (UTC+7).
    expect(currentMonth(new Date("2026-10-31T20:00:00Z"))).toBe(11);
    expect(currentMonth(new Date("2026-10-31T10:00:00Z"))).toBe(10);
  });
});

describe("monthName", () => {
  it("gives the month in English and Khmer", () => {
    expect(monthName(11, "en")).toBe("November");
    expect(monthName(11, "km")).toMatch(/[ក-៿]/);
  });

  it("gives a one-letter month for the season strip", () => {
    expect(monthName(1, "en", "narrow")).toBe("J");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  it("says hours for recent dates", () => {
    expect(timeAgo("2026-11-17T10:00:00Z", "en", now)).toBe("2 hours ago");
  });
  it("says yesterday for one day ago", () => {
    expect(timeAgo("2026-11-16T12:00:00Z", "en", now)).toBe("yesterday");
  });
  it("works in Khmer", () => {
    expect(timeAgo("2026-11-17T10:00:00Z", "km", now)).toMatch(/[ក-៿]/);
  });
});

describe("formatDate", () => {
  it("formats a long date", () => {
    expect(formatDate("2026-11-03T05:00:00Z", "en")).toBe("November 3, 2026");
  });
});
