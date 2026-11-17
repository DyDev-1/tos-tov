import { expect, test } from "@playwright/test";

test("visiting / redirects to English home", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("language toggle switches to Khmer", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "ភាសាខ្មែរ" }).click();
  await expect(page).toHaveURL(/\/km$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "km");
});

// Needs a migrated and seeded database (npm run db:migrate && npm run db:seed).
test("home shows provinces and category chips in English", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Explore by province" })).toBeVisible();
  await expect(page.getByTestId("province-card")).toHaveCount(25);
  await expect(page.getByTestId("province-card").first()).toContainText("Siem Reap");
  await expect(page.getByTestId("province-card").first()).toContainText("សៀមរាប");
  await expect(page.getByTestId("category-chip")).toHaveCount(5);
  await expect(page.getByTestId("category-chip").first()).toHaveText("Temples");
});

test("home shows provinces and category chips in Khmer", async ({ page }) => {
  await page.goto("/km");
  await expect(page.getByRole("heading", { name: "ស្វែងរកតាមខេត្ត" })).toBeVisible();
  await expect(page.getByTestId("province-card").first()).toContainText("សៀមរាប");
  await expect(page.getByTestId("category-chip").first()).toHaveText("ប្រាសាទ");
});

test.describe("home sections", () => {
  test("search sends the words and season to the Map page", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("searchbox", { name: "Search places" }).fill("Bou Sra");
    await page.getByLabel("Season").selectOption("7");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/en\/map\?q=Bou\+Sra&month=7$/);
  });

  test("season list defaults to this month and offers any season", async ({ page }) => {
    await page.goto("/en");
    const select = page.getByLabel("Season");
    await expect(select.locator("option")).toHaveCount(13);
    await expect(select.locator("option").first()).toHaveText("Any season");
    await expect(select).not.toHaveValue("");
  });

  test("a province card opens the map filtered to that province", async ({ page }) => {
    await page.goto("/en");
    await page.getByTestId("province-card").first().getByRole("link").click();
    await expect(page).toHaveURL(/\/en\/map\?province=siem-reap$/);
  });

  test("a category chip opens the map filtered to that category", async ({ page }) => {
    await page.goto("/en");
    await page.getByTestId("category-chip").first().getByRole("link").click();
    await expect(page).toHaveURL(/\/en\/map\?category=temples$/);
  });

  test("All 25 opens the provinces page with every province", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "All 25" }).click();
    await expect(page).toHaveURL(/\/en\/provinces$/);
    await expect(page.getByTestId("province-card")).toHaveCount(25);
  });

  test("best this month shows up to 3 places, or a friendly empty message", async ({ page }) => {
    await page.goto("/en");
    const section = page.getByRole("region", { name: "Best this month" });
    await expect(section).toBeVisible();
    // Wait for the loading placeholder to be replaced by the real content.
    await expect(section.getByRole("status")).toHaveCount(0);
    const cards = section.getByTestId("place-card");
    if ((await cards.count()) === 0) {
      await expect(section.getByText("No places are at their best this month yet.")).toBeVisible();
    } else {
      expect(await cards.count()).toBeLessThanOrEqual(3);
    }
  });

  test("recently added lists the newest places with who added them", async ({ page }) => {
    await page.goto("/en");
    const section = page.getByRole("region", { name: "Recently added by the community" });
    await expect(section.getByTestId("place-row")).toHaveCount(4);
    await expect(section.getByTestId("place-row").first()).toContainText("Phnom Chhngok Cave Temple");
    await expect(section.getByTestId("place-row").first()).toContainText("Added by Dara");
  });

  test("Khmer home has Khmer headings and season text", async ({ page }) => {
    await page.goto("/km");
    await expect(page.getByRole("region", { name: "ថ្មីៗពីសហគមន៍" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "ស្វែងរកកន្លែង" })).toBeVisible();
  });
});
