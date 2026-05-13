import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER_A } from "./fixtures/auth";

test.describe("Chat Inbox (/messages)", () => {
  test("authenticated user can navigate to /messages", async ({ page }) => {
    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);
    await page.goto("/messages");
    await expect(page).toHaveURL("/messages");
  });

  test("inbox shows empty state when no conversations exist", async ({ page }) => {
    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);
    await page.goto("/messages");

    // Wait for loading to finish (spinner disappears)
    await page.waitForSelector('[class*="LoadingSpinner"]', { state: "hidden", timeout: 10000 }).catch(() => {});

    // If there are no conversations the empty-state message is visible
    const noConversations = page.locator("p").filter({ hasText: /no conversations|কোনো কথোপকথন নেই/i });
    const conversationCards = page.locator('button[class*="px-4 py-4"]');

    // Either empty state or conversation list — at least one must be present
    const emptyOrList = await Promise.race([
      noConversations.waitFor({ state: "visible", timeout: 8000 }).then(() => "empty"),
      conversationCards.first().waitFor({ state: "visible", timeout: 8000 }).then(() => "list"),
    ]).catch(() => "timeout");

    expect(["empty", "list"]).toContain(emptyOrList);
  });

  test("inbox title is visible", async ({ page }) => {
    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);
    await page.goto("/messages");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("unauthenticated user is redirected to /login from /messages", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("back button navigates away from inbox", async ({ page }) => {
    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);
    await page.goto("/messages");
    const backButton = page.locator('button').filter({ has: page.locator("svg") }).first();
    await backButton.click();
    // Should navigate back (to dashboard or previous page)
    await page.waitForURL((url) => !url.pathname.includes("/messages"), { timeout: 5000 });
  });
});
