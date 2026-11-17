import { expect, test } from "@playwright/test";

test.describe("map view", () => {
  test("shows every place in the list and as a pin, with a count", async ({ page }) => {
    await page.goto("/en/map");
    await expect(page.getByRole("status")).toHaveText("8 places match");
    await expect(page.getByTestId("map-list-item")).toHaveCount(8);
    await expect(page.getByRole("region", { name: /Map of Cambodia/ })).toBeVisible();
    await expect(page.locator(".tt-pin")).toHaveCount(8);
  });

  test("filters by province from the address", async ({ page }) => {
    await page.goto("/en/map?province=preah-sihanouk");
    await expect(page.getByRole("status")).toHaveText("2 places match");
    await expect(page.getByLabel("Province")).toHaveValue("preah-sihanouk");
  });

  test("changing a filter updates the address and the results", async ({ page }) => {
    await page.goto("/en/map");
    await page.getByLabel("Category").selectOption("waterfalls");
    await expect(page).toHaveURL(/category=waterfalls/);
    await expect(page.getByRole("status")).toHaveText("2 places match");

    await page.getByLabel("Season").selectOption("7");
    await expect(page).toHaveURL(/month=7/);
    await expect(page).toHaveURL(/category=waterfalls/);
    await expect(page.getByRole("status")).toHaveText("2 places match");

    await page.getByLabel("Province").selectOption("kampong-speu");
    await expect(page.getByRole("status")).toHaveText("1 place matches");
  });

  test("combines home search words with a season", async ({ page }) => {
    await page.goto("/en/map?q=bou&month=7");
    await expect(page.getByRole("status")).toHaveText("1 place matches");
    await page.getByRole("button", { name: "Remove search" }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(page.getByRole("status")).toHaveText("2 places match");
  });

  test("shows a friendly message and a way out when nothing matches", async ({ page }) => {
    await page.goto("/en/map?q=zzzz");
    await expect(page.getByText("No places match these filters.")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.getByRole("status")).toHaveText("8 places match");
  });

  test("ignores filters that are not valid", async ({ page }) => {
    await page.goto("/en/map?month=99");
    await expect(page.getByRole("status")).toHaveText("8 places match");
  });

  test("selects a place: card with View place and Directions", async ({ page }) => {
    await page.goto("/en/map");
    // The most liked place is selected first.
    const card = page.getByRole("group", { name: "Selected place" });
    await expect(card).toContainText("Angkor Wat");
    await expect(card.getByRole("link", { name: "Directions" })).toHaveAttribute(
      "href",
      /google\.com\/maps\/dir\/\?api=1&destination=13\.4125,103\.867/,
    );
    await expect(card.getByRole("link", { name: "View place" })).toHaveAttribute("href", /\/en\/places\/angkor-wat$/);
  });

  test("works in Khmer", async ({ page }) => {
    await page.goto("/km/map");
    await expect(page.getByRole("status")).toHaveText("8 កន្លែងត្រូវគ្នា");
    await expect(page.getByRole("group", { name: "កន្លែងដែលបានជ្រើស" })).toBeVisible();
  });

  test("the Add a place button does not cover the map", async ({ page }) => {
    await page.goto("/en/map");
    await expect(page.getByRole("link", { name: "Add a place" })).toHaveCount(0);
  });
});

test.describe("map view on desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop layout only");

  test("clicking a list item selects it and moves the card", async ({ page }) => {
    await page.goto("/en/map");
    const items = page.getByTestId("map-list-item");
    await items.nth(2).click();
    await expect(items.nth(2)).toHaveAttribute("aria-pressed", "true");
    await expect(items.first()).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("group", { name: "Selected place" })).toContainText(
      (await items.nth(2).locator("span.font-heading").textContent())!,
    );
  });

  test("clicking a pin selects that place", async ({ page }) => {
    await page.goto("/en/map");
    await expect(page.locator(".tt-pin")).toHaveCount(8);
    await page.locator(".tt-pin--normal").first().click({ force: true });
    await expect(page.getByTestId("map-list-item").and(page.locator('[aria-pressed="true"]'))).toHaveCount(1);
  });

  test("shows the list and the map side by side", async ({ page }) => {
    await page.goto("/en/map");
    await expect(page.getByTestId("map-list-item").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Show list/ })).toBeHidden();
  });
});

test.describe("map view on phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone layout only");

  test("shows the map first, and a Show list button swaps to the list", async ({ page }) => {
    await page.goto("/en/map");
    await expect(page.getByTestId("map-list-item").first()).toBeHidden();
    await page.getByRole("button", { name: "Show list (8)" }).click();
    await expect(page.getByTestId("map-list-item").first()).toBeVisible();
    await page.getByRole("button", { name: "Show map" }).click();
    await expect(page.getByTestId("map-list-item").first()).toBeHidden();
  });
});
