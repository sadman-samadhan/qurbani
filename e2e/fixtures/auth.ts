import { Page } from "@playwright/test";

export const TEST_USER_A = {
  phone: process.env.TEST_USER_A_PHONE || "01700000001",
  password: process.env.TEST_USER_A_PASSWORD || "Test1234!",
};

export const TEST_USER_B = {
  phone: process.env.TEST_USER_B_PHONE || "01700000002",
  password: process.env.TEST_USER_B_PASSWORD || "Test1234!",
};

export async function loginAs(page: Page, phone: string, password: string) {
  await page.goto("/login");
  await page.fill('input[type="tel"]', phone);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 15000 });
}
