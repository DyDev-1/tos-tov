import { expect, test } from "@playwright/test";

// The app running as release stage 1: admin-posted places only. Visitors can browse, like, save and report,
// but cannot comment, share posts or add places. (The server also refuses these: see
// tests/integration/release-stage.test.ts.)

test.describe("release stage 1", () => {
  test("the features API says stage 1 and what is open", async ({ request }) => {
    const { data } = await (await request.get("/api/v1/features")).json();
    expect(data.stage).toBe(1);
    expect(data.capabilities).toEqual({ like: true, save: true, report: true, comment: false, sharePost: false, addPlace: false });
  });

  test("Home works, without the Add a place button or the share link", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByTestId("province-card")).toHaveCount(25);
    await expect(page.getByRole("link", { name: "Add a place" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Share your experience" })).toHaveCount(0);
    // "See more new places" is still there.
    await expect(page.getByRole("link", { name: "See more new places" })).toBeVisible();
  });

  test("the place page shows posts, like, save and share, but says comments open soon", async ({ page }) => {
    await page.goto("/en/places/bou-sra-waterfall");
    await expect(page.getByTestId("post")).toHaveCount(2);
    await expect(page.getByRole("button", { name: /Like/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(page.getByText("Comments will open soon.")).toBeVisible();
    await expect(page.getByPlaceholder("Log in to comment")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Share your experience" })).toHaveCount(0);
  });

  test("the map and the saved page still work", async ({ page }) => {
    await page.goto("/en/map");
    await expect(page.getByRole("status")).toHaveText("8 places match");
    await page.goto("/en/saved");
    await expect(page.getByRole("heading", { name: "Log in to see your saved places" })).toBeVisible();
  });

  test("the Add a place page says it is not open yet, with a quiet way in for the team", async ({ page }) => {
    await page.goto("/en/add-place");
    await expect(page.getByRole("heading", { name: "Adding places is not open yet" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("2. Name of the place")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Team member? Log in" })).toHaveAttribute("href", /sign-in\?redirect_url=%2Fen%2Fadd-place/);
  });

  test("the share page says it is not open yet", async ({ page }) => {
    await page.goto("/en/share");
    await expect(page.getByRole("heading", { name: "Sharing is not open yet" })).toBeVisible({ timeout: 20_000 });
  });

  test("works in Khmer", async ({ page }) => {
    await page.goto("/km/add-place");
    await expect(page.getByRole("heading", { name: "ការបន្ថែមកន្លែងមិនទាន់បើកទេ" })).toBeVisible({ timeout: 20_000 });
  });
});
