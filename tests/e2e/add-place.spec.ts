import { expect, test } from "@playwright/test";

// The form itself needs a logged-in person, so it is tested with a pretend login in
// tests/components/add-place-form.test.tsx. Here we check the page as a visitor sees it.

test.describe("add a place page", () => {
  test("has a title, intro and a way to cancel", async ({ page }) => {
    await page.goto("/en/add-place");
    await expect(page.getByRole("heading", { level: 1, name: "Add a place" })).toBeVisible();
    await expect(page.getByText("Only the first four steps are required.")).toBeVisible();
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test("asks a visitor to log in, and comes back afterwards", async ({ page }) => {
    await page.goto("/en/add-place");
    await expect(page.getByRole("heading", { name: "Log in to add a place" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: "Log in" }).last()).toHaveAttribute("href", /sign-in\?redirect_url=%2Fen%2Fadd-place/);
    await expect(page.getByLabel("2. Name of the place")).toHaveCount(0);
  });

  test("works in Khmer", async ({ page }) => {
    await page.goto("/km/add-place");
    await expect(page.getByRole("heading", { level: 1, name: "បន្ថែមកន្លែង" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ចូលគណនីដើម្បីបន្ថែមកន្លែង" })).toBeVisible({ timeout: 20_000 });
  });

  test("has no tab bar or floating button: the form has its own bottom button", async ({ page }) => {
    await page.goto("/en/add-place");
    await expect(page.getByRole("navigation", { name: "Main tabs" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add a place" })).toHaveCount(0);
  });
});

test.describe("saved page", () => {
  test("asks a visitor to log in", async ({ page }) => {
    await page.goto("/en/saved");
    await expect(page.getByRole("heading", { level: 1, name: "Saved" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Log in to see your saved places" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" }).last()).toHaveAttribute("href", /sign-in\?redirect_url=%2Fen%2Fsaved/);
  });

  test("works in Khmer", async ({ page }) => {
    await page.goto("/km/saved");
    await expect(page.getByRole("heading", { level: 1, name: "បានរក្សាទុក" })).toBeVisible();
  });
});
