import { expect, test } from "@playwright/test";

const PLACE = "/en/places/bou-sra-waterfall";

test.describe("place page", () => {
  test("shows the place with its tags, facts and likes", async ({ page }) => {
    await page.goto(PLACE);
    await expect(page.getByRole("heading", { level: 1, name: "Bou Sra Waterfall" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Waterfalls" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Mondulkiri" }).first()).toBeVisible();
    await expect(page.getByText("A two-tier waterfall in the forest")).toBeVisible();
    await expect(page.getByRole("button", { name: /Like.*1,248 likes/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "2 comments" })).toBeVisible();
  });

  test("lists what you need, with the entry fee not listed yet", async ({ page }) => {
    await page.goto(PLACE);
    const need = page.getByRole("region", { name: "What you need" });
    await expect(need.getByText("Not listed yet")).toBeVisible();
    await expect(need.getByText("Pay at the gate, no pass needed")).toBeVisible();
    await expect(need.getByText("Shoes with grip, water, rain jacket")).toBeVisible();
  });

  test("marks best months and months to avoid on the season strip", async ({ page }) => {
    await page.goto(PLACE);
    const strip = page.getByRole("region", { name: "Best season" });
    for (const month of [7, 8, 9, 10, 11, 12]) {
      await expect(strip.locator(`[data-month="${month}"]`)).toHaveAttribute("data-status", /best/);
    }
    for (const month of [3, 4]) {
      await expect(strip.locator(`[data-month="${month}"]`)).toHaveAttribute("data-status", /avoid/);
    }
    await expect(strip.locator('[data-status~="now"]')).toHaveCount(1);
    await expect(strip.getByText(/March and April: very little water/)).toBeVisible();
  });

  test("has practical info, comments and guides with contact buttons only", async ({ page }) => {
    await page.goto(PLACE);
    await expect(page.getByRole("region", { name: "Practical" }).getByText("2 to 3 hours")).toBeVisible();
    await expect(page.getByTestId("comment")).toHaveCount(2);
    await expect(page.getByTestId("comment").first()).toContainText("Vanna");

    const tours = page.getByRole("region", { name: "Local tours and guides" });
    await expect(tours.getByRole("link", { name: "Demo guide A on Telegram" })).toHaveAttribute("href", "https://t.me/demo_guide_tostov");
    await expect(tours.getByRole("link", { name: "Call Demo guide B" })).toHaveAttribute("href", /^tel:\+855/);
    await expect(tours.getByText("Booking and payment happen outside this site.")).toBeVisible();
  });

  test("opens Google Maps for directions in a new tab", async ({ page }) => {
    await page.goto(PLACE);
    const link = page.getByRole("link", { name: "Open in Google Maps" });
    await expect(link).toHaveAttribute("href", /google\.com\/maps\/dir\/\?api=1&destination=12\.5135,107\.4287/);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("shows a map with a pin", async ({ page }) => {
    await page.goto(PLACE);
    await expect(page.getByRole("region", { name: "Map showing Bou Sra Waterfall" })).toBeVisible();
    await expect(page.locator(".tt-pin")).toHaveCount(1);
  });

  test("puts Getting there after the description on phone, and beside it on desktop", async ({ page }, testInfo) => {
    await page.goto(PLACE);
    const gettingThere = await page.getByRole("region", { name: "Getting there" }).boundingBox();
    const need = await page.getByRole("region", { name: "What you need" }).boundingBox();
    if (testInfo.project.name === "phone") {
      expect(gettingThere!.y).toBeLessThan(need!.y);
    } else {
      expect(gettingThere!.x).toBeGreaterThan(need!.x + need!.width - 1);
    }
  });

  test("works in Khmer", async ({ page }) => {
    await page.goto("/km/places/bou-sra-waterfall");
    await expect(page.getByRole("heading", { level: 1, name: "ទឹកធ្លាក់ប៊ូស្រា" })).toBeVisible();
    await expect(page.getByRole("region", { name: "រដូវល្អបំផុត" })).toBeVisible();
    await expect(page.getByRole("region", { name: "មតិយោបល់" })).toBeVisible();
    await expect(page.getByRole("link", { name: "បើកក្នុង Google Maps" })).toBeVisible();
  });

  test("shows a friendly page for a place that does not exist", async ({ page }) => {
    await page.goto("/en/places/does-not-exist");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Back to Explore" }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test("a card on Home opens its place page", async ({ page }) => {
    await page.goto("/en");
    await page.getByTestId("place-row").first().click();
    await expect(page).toHaveURL(/\/en\/places\/phnom-chhngok-cave-temple$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Phnom Chhngok Cave Temple");
  });

  test("phone has a Back button on the photo", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone");
    await page.goto(PLACE);
    await expect(page.getByRole("link", { name: "Back" })).toBeVisible();
  });
});

test.describe("experiences (posts) and sharing", () => {
  test("shows the average rating and the experiences, newest first", async ({ page }) => {
    await page.goto(PLACE);
    await expect(page.getByText("4.5 out of 5 · 2 posts").first()).toBeVisible();
    const section = page.getByRole("region", { name: "Experiences" });
    await expect(section.getByTestId("post")).toHaveCount(2);
    await expect(section.getByTestId("post").first()).toContainText("Vanna");
    await expect(section.getByTestId("post").first()).toContainText("Visited November 8, 2026");
    await expect(section.getByRole("img", { name: "Rated 5 out of 5" })).toBeVisible();
  });

  test("a place without ratings says so", async ({ page }) => {
    await page.goto("/en/places/kep-crab-market");
    await expect(page.getByRole("region", { name: "Experiences" }).getByText("No ratings yet")).toBeVisible();
    await expect(page.getByText("No experiences shared yet. Be the first to share yours.")).toBeVisible();
  });

  test("the Share your experience button opens the share page for this place", async ({ page }) => {
    await page.goto(PLACE);
    await page.getByRole("link", { name: "Share your experience" }).click();
    await expect(page).toHaveURL(/\/en\/share\?place=bou-sra-waterfall$/);
  });

  test("the Share menu offers Facebook, Telegram and copy link", async ({ page }) => {
    await page.goto(PLACE);
    await page.getByRole("button", { name: "Share", exact: true }).first().click();
    const menu = page.getByRole("group", { name: "Share this page" });
    await expect(menu.getByRole("link", { name: /Facebook/ })).toHaveAttribute("href", /facebook\.com\/sharer\/sharer\.php\?u=.*bou-sra-waterfall/);
    await expect(menu.getByRole("link", { name: /Telegram/ })).toHaveAttribute("href", /t\.me\/share\/url\?url=.*bou-sra-waterfall/);
    await expect(menu.getByRole("button", { name: "Copy link" })).toBeVisible();
  });

  test("has a page preview for sharing (Open Graph)", async ({ page }) => {
    await page.goto(PLACE);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Bou Sra Waterfall/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /Full flow after the rains/);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /\/en\/places\/bou-sra-waterfall$/);
  });

  test("works in Khmer", async ({ page }) => {
    await page.goto("/km/places/bou-sra-waterfall");
    await expect(page.getByRole("region", { name: "បទពិសោធន៍" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ចែករំលែកបទពិសោធន៍របស់អ្នក" })).toBeVisible();
  });
});
