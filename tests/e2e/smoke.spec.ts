import { expect, test } from "@playwright/test";

test("public home renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/AI3/i);
  await expect(page.getByRole("link", { name: /jelajahi produk/i })).toBeVisible();
});

test("products page renders list shell", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: /semua produk/i })).toBeVisible();
});

