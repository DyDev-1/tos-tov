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
