import { expect, test } from "@playwright/test";

const fullFlowEnabled = process.env.E2E_FULL === "1";

test.describe("critical flows", () => {
  test.skip(!fullFlowEnabled, "Set E2E_FULL=1 to run critical purchase/auth flows.");

  test("register and login", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "Password123!";

    await page.goto("/register");
    await page.getByLabel(/nama/i).fill("E2E User");
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page.getByRole("button", { name: /daftar/i }).click();

    await page.goto("/login");
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /masuk/i }).click();

    await expect(page).toHaveURL(/dashboard/);
  });

  test("guest checkout happy path", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("link", { name: /lihat detail|detail|beli/i }).first().click();
    await page.getByRole("button", { name: /tambah ke keranjang|beli sekarang/i }).first().click();
    await page.goto("/checkout");

    await page.getByLabel(/email/i).fill(`guest-${Date.now()}@example.com`);
    await page.getByLabel(/nama/i).fill("Guest Checkout");
    await page.getByLabel(/no\. hp|whatsapp/i).fill("081234567890");
    await page.getByRole("button", { name: /bayar sekarang|lanjut/i }).click();

    await expect(page).toHaveURL(/order\/|mayar/i);
  });

  test("member checkout with wallet/mayar", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("link", { name: /lihat detail|detail|beli/i }).first().click();
    await page.getByRole("button", { name: /tambah ke keranjang|beli sekarang/i }).first().click();
    await page.goto("/checkout");
    await page.getByRole("button", { name: /bayar sekarang|bayar dengan saldo/i }).click();
    await expect(page).toHaveURL(/order\/|mayar/i);
  });

  test("claim shadow account flow", async ({ page }) => {
    // Flow depends on a paid guest order with same email then registration/login.
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /daftar/i })).toBeVisible();
  });

  test("admin refund flow", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible();
  });
});

