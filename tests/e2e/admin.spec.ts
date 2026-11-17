import { expect, test } from "@playwright/test";

// Admin screens need an admin login, which these browser tests do not have. Their content is tested with
// component tests (tests/components/admin.test.tsx) and their rules with integration tests
// (tests/integration/admin-*.test.ts). Here we check what an outsider can and cannot reach.

const PAGES = [
  "/admin",
  "/admin/places",
  "/admin/places/1",
  "/admin/posts",
  "/admin/comments",
  "/admin/reports",
  "/admin/categories",
  "/admin/users",
  "/admin/log",
];

test.describe("admin pages for a visitor who is not logged in", () => {
  for (const path of PAGES) {
    test(`${path} sends the visitor to log in first`, async ({ page }) => {
      await page.goto(`/en${path}`);
      await expect(page).toHaveURL(/\/en\/sign-in/);
      // After logging in, an admin lands on the admin home (the safe place to start).
      expect(new URL(page.url()).searchParams.get("redirect_url")).toBe("/en/admin");
    });
  }

  test("works in Khmer too", async ({ page }) => {
    await page.goto("/km/admin/places");
    await expect(page).toHaveURL(/\/km\/sign-in/);
  });

  test("shows nothing of the admin area before the redirect", async ({ page }) => {
    await page.goto("/en/admin/users");
    await expect(page.getByText("Admin menu")).toHaveCount(0);
    await expect(page.getByTestId("admin-user")).toHaveCount(0);
  });
});

test.describe("admin API for a visitor who is not logged in", () => {
  for (const path of ["overview", "places", "posts", "comments", "reports", "categories", "users", "audit-log"]) {
    test(`GET /api/v1/admin/${path} answers 401`, async ({ request }) => {
      const response = await request.get(`/api/v1/admin/${path}`);
      expect(response.status()).toBe(401);
      expect((await response.json()).error.code).toBe("unauthorized");
    });
  }

  test("changes are refused too", async ({ request }) => {
    expect((await request.post("/api/v1/admin/places/1/status", { data: { status: "hidden" } })).status()).toBe(401);
    expect((await request.post("/api/v1/admin/users/1/ban", { data: { reason: "test" } })).status()).toBe(401);
    expect((await request.delete("/api/v1/admin/categories/1")).status()).toBe(401);
  });

  test("/api/v1/me answers 401", async ({ request }) => {
    expect((await request.get("/api/v1/me")).status()).toBe(401);
  });
});

test.describe("header", () => {
  test("does not show the Admin link to a visitor", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });
});
