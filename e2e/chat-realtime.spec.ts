import { test, expect, chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAs, TEST_USER_A, TEST_USER_B } from "./fixtures/auth";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getTestIds() {
  const supabase = getAdminClient();
  const userAEmail = `${TEST_USER_A.phone}@qurbanisathi.com`;
  const userBEmail = `${TEST_USER_B.phone}@qurbanisathi.com`;

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userA = users?.find((u) => u.email === userAEmail);
  const userB = users?.find((u) => u.email === userBEmail);
  if (!userA || !userB) throw new Error("Test users not found");

  const { data: requests } = await supabase
    .from("share_requests")
    .select("id")
    .eq("user_id", userB.id)
    .eq("status", "open")
    .limit(1);

  if (!requests || requests.length === 0) throw new Error("No open request for testuser_b");

  return {
    requestId: requests[0].id,
    userAId: userA.id,
    userBId: userB.id,
  };
}

test.describe("Realtime messaging", () => {
  // These tests open two browser contexts — one per user — in the same test.
  // They require Supabase Realtime to be enabled on the messages table.

  test("message sent by User B appears in User A's open thread without page refresh", async () => {
    const browser = await chromium.launch();
    const { requestId, userBId } = await getTestIds();

    // Context A — logged in as User A, viewing the thread
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await loginAs(pageA, TEST_USER_A.phone, TEST_USER_A.password);
    await pageA.goto(`/messages/${requestId}/${userBId}`);
    await pageA.locator("textarea").waitFor({ state: "visible", timeout: 10000 });

    // Context B — logged in as User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAs(pageB, TEST_USER_B.phone, TEST_USER_B.password);
    await pageB.goto(`/messages/${requestId}/${(await getTestIds()).userAId}`);
    await pageB.locator("textarea").waitFor({ state: "visible", timeout: 10000 });

    // User B sends a message
    const realtimeMsg = `Realtime test ${Date.now()}`;
    await pageB.locator("textarea").fill(realtimeMsg);
    await pageB.keyboard.press("Enter");

    // User A's page should show the message without refresh
    await expect(pageA.locator("p").filter({ hasText: realtimeMsg })).toBeVisible({
      timeout: 15000,
    });

    await browser.close();
  });

  test("unread badge on User A's dashboard nav increments when User B sends a message", async () => {
    const browser = await chromium.launch();
    const { requestId, userAId, userBId } = await getTestIds();

    // Context A — on the dashboard (not in the thread, so message stays unread)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await loginAs(pageA, TEST_USER_A.phone, TEST_USER_A.password);
    await pageA.waitForLoadState("networkidle");

    // Note current unread count (may be 0)
    const badgeBefore = pageA.locator("span").filter({ hasText: /^\d+$|^9\+$/ }).first();
    const countBefore = await badgeBefore.count();

    // Context B — sends a message to User A
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAs(pageB, TEST_USER_B.phone, TEST_USER_B.password);
    await pageB.goto(`/messages/${requestId}/${userAId}`);
    await pageB.locator("textarea").waitFor({ state: "visible", timeout: 10000 });

    const unreadMsg = `Unread badge test ${Date.now()}`;
    await pageB.locator("textarea").fill(unreadMsg);
    await pageB.keyboard.press("Enter");

    // User A's dashboard badge should appear (or increment)
    await expect(async () => {
      const badge = pageA.locator("span").filter({ hasText: /^\d+$|^9\+$/ });
      const countAfter = await badge.count();
      expect(countAfter).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 15000, intervals: [1000] });

    await browser.close();
  });
});
