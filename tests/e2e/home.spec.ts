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
