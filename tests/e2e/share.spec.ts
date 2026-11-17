import { expect, test } from "@playwright/test";

// The form needs a logged-in person, so it is tested with a pretend login in
// tests/components/share-post-form.test.tsx. Here we check the page as a visitor sees it.

test.describe("share page", () => {
  test("has a title and an intro", async ({ page }) => {
    await page.goto("/en/share");
    await expect(page.getByRole("heading", { level: 1, name: "Share your experience" })).toBeVisible();
    await expect(page.getByText("Your post appears on the place page after an admin checks it.")).toBeVisible();
  });

  test("asks a visitor to log in, and comes back to the same place", async ({ page }) => {
    await page.goto("/en/share?place=bou-sra-waterfall");
    await expect(page.getByRole("heading", { name: "Log in to share your experience" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: "Log in" }).last()).toHaveAttribute(
      "href",
      new RegExp(encodeURIComponent("/en/share?place=bou-sra-waterfall").replace(/\./g, "\\.")),
    );
  });

  test("Cancel goes back to the place that was chosen", async ({ page }) => {
    await page.goto("/en/share?place=bou-sra-waterfall");
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/en\/places\/bou-sra-waterfall$/);
  });

  test("works in Khmer and has no tab bar", async ({ page }) => {
    await page.goto("/km/share");
    await expect(page.getByRole("heading", { level: 1, name: "ចែករំលែកបទពិសោធន៍របស់អ្នក" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "ផ្ទាំងមេ" })).toHaveCount(0);
  });

  test("is reachable from Home and from the Add a place page", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("region", { name: "Recently added by the community" }).getByRole("link", { name: "Share your experience" }).click();
    await expect(page).toHaveURL(/\/en\/share$/);

    await page.goto("/en/add-place");
    await page.getByRole("link", { name: "Already on the list? Share your experience instead" }).click();
    await expect(page).toHaveURL(/\/en\/share$/);
  });
});
