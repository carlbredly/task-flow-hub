import { expect, test } from "@playwright/test";

test("auth page is reachable", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /sign in|create account/i })).toBeVisible();
});

test("auth form fields are visible on mobile", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Ce test ne concerne que le projet mobile.");
  await page.goto("/auth");
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});

test("desktop can switch auth mode", async ({ page, isMobile }) => {
  test.skip(isMobile, "Ce test concerne la version desktop.");
  await page.goto("/auth");
  await page.getByRole("button", { name: /no account\? sign up/i }).click();
  await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
});
