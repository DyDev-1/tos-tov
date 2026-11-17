import { expect, test } from "@playwright/test";

// The shell (header, tab bar, "Add a place" button) appears on every page.
// Desktop shows the header navigation; phone shows the bottom tab bar instead.

test.describe("navigation by screen size", () => {
  test("shows the right navigation for this screen", async ({ page }, testInfo) => {
    await page.goto("/en");
    const header = page.getByRole("navigation", { name: "Main navigation" });
    const tabs = page.getByRole("navigation", { name: "Main tabs" });

    if (testInfo.project.name === "phone") {
      await expect(tabs).toBeVisible();
      await expect(header).toBeHidden();
      await expect(tabs.getByRole("link")).toHaveCount(3);
    } else {
      await expect(header).toBeVisible();
      await expect(tabs).toBeHidden();
      await expect(header.getByRole("link")).toHaveText(["Explore", "Map", "Saved"]);
    }
  });

  test("marks the current page and moves between pages", async ({ page }, testInfo) => {
    await page.goto("/en");
    const nav = page.getByRole("navigation", {
      name: testInfo.project.name === "phone" ? "Main tabs" : "Main navigation",
    });
    await expect(nav.getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: "Map" }).click();
    await expect(page).toHaveURL(/\/en\/map$/);
    await expect(nav.getByRole("link", { name: "Map" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1, name: "Map" })).toBeVisible();
    await expect(page.getByText("Coming soon")).toBeVisible();
  });
});

test.describe("language toggle", () => {
  test("keeps the same page when switching language", async ({ page }) => {
    await page.goto("/en/saved");
    await page.getByRole("link", { name: "ភាសាខ្មែរ" }).click();
    await expect(page).toHaveURL(/\/km\/saved$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "km");
    await expect(page.getByRole("heading", { level: 1, name: "បានរក្សាទុក" })).toBeVisible();
  });

  test("marks the current language", async ({ page }) => {
    await page.goto("/km");
    await expect(page.getByRole("link", { name: "ភាសាខ្មែរ" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("link", { name: "English" })).not.toHaveAttribute("aria-current", "true");
  });
});

test.describe("Add a place button", () => {
  test("is on every page and opens the Add a place page", async ({ page }) => {
    await page.goto("/en/saved");
    await page.getByRole("link", { name: "Add a place" }).click();
    await expect(page).toHaveURL(/\/en\/add-place$/);
  });

  test("is in Khmer on the Khmer site", async ({ page }) => {
    await page.goto("/km");
    await expect(page.getByRole("link", { name: "បន្ថែមកន្លែង" })).toBeVisible();
  });
});

test.describe("accessibility basics", () => {
  test("has a skip link that jumps to the content", async ({ page }) => {
    await page.goto("/en");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
  });

  test("main buttons and links are at least 44px tall", async ({ page }, testInfo) => {
    await page.goto("/en");
    const nav = page.getByRole("navigation", {
      name: testInfo.project.name === "phone" ? "Main tabs" : "Main navigation",
    });
    const targets = [
      ...(await nav.getByRole("link").all()),
      page.getByRole("link", { name: "Add a place" }),
      page.getByRole("link", { name: "English" }),
    ];
    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
