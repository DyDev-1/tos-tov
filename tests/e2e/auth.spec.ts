import { expect, test } from "@playwright/test";

test.describe("sign up and log in pages", () => {
  test("sign up page has the heading, tabs and the Clerk form", async ({ page }) => {
    await page.goto("/en/sign-up");
    await expect(page.getByRole("heading", { level: 1, name: "Join to share the places you find" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Sign up or log in" });
    await expect(tabs.getByRole("link", { name: "Sign up" })).toHaveAttribute("aria-current", "page");
    // Clerk draws the form (and handles all passwords) after its script loads.
    await expect(page.locator(".cl-rootBox")).toBeVisible({ timeout: 20_000 });
  });

  test("the Log in tab opens the log in page", async ({ page }) => {
    await page.goto("/en/sign-up");
    await page.getByRole("navigation", { name: "Sign up or log in" }).getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/en\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sign up or log in" }).getByRole("link", { name: "Log in" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("Keep browsing without an account returns to Home", async ({ page }) => {
    await page.goto("/en/sign-in");
    await page.getByRole("link", { name: "Keep browsing without an account" }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test("is a focused screen: no navigation, tab bar or Add a place button", async ({ page }) => {
    await page.goto("/en/sign-up");
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main tabs" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add a place" })).toHaveCount(0);
    // The language toggle stays.
    await expect(page.getByRole("link", { name: "ភាសាខ្មែរ" })).toBeVisible();
  });

  test("works in Khmer and keeps the page when switching language", async ({ page }) => {
    await page.goto("/en/sign-up");
    await page.getByRole("link", { name: "ភាសាខ្មែរ" }).click();
    await expect(page).toHaveURL(/\/km\/sign-up$/);
    await expect(page.getByRole("heading", { level: 1, name: "ចូលរួមដើម្បីចែករំលែកកន្លែងដែលអ្នករកឃើញ" })).toBeVisible();
    await expect(page.getByRole("link", { name: "បន្តរកមើលដោយគ្មានគណនី" })).toBeVisible();
  });
});

test.describe("entry points to log in", () => {
  test("the header Log in button opens the log in page (desktop)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "header button is desktop only");
    await page.goto("/en");
    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/en\/sign-in$/);
  });

  test("the Profile tab opens the log in page when logged out (phone)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "tab bar is phone only");
    await page.goto("/en");
    await page.getByRole("navigation", { name: "Main tabs" }).getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/en\/sign-in$/);
  });
});
