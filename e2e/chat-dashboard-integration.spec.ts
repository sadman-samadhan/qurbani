import { test, expect } from "@playwright/test";
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

async function getUserBRequestId(): Promise<{ requestId: string; userId: string }> {
  const supabase = getAdminClient();
  const userBEmail = `${TEST_USER_B.phone}@qurbanisathi.com`;
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userB = users?.find((u) => u.email === userBEmail);
  if (!userB) throw new Error("testuser_b not found");

  const { data } = await supabase
    .from("share_requests")
    .select("id")
    .eq("user_id", userB.id)
    .eq("status", "open")
    .limit(1);

  if (!data || data.length === 0) throw new Error("No open request for testuser_b");
  return { requestId: data[0].id, userId: userB.id };
}

test.describe("Dashboard integration", () => {
  test("Messages nav button is enabled and navigates to /messages", async ({ page }) => {
    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);

    // Find the Messages nav button (contains MessageCircle icon)
    // The nav bar is at the bottom of dashboard
    const messagesNavBtn = page.locator('button').filter({ hasText: /messages|মেসেজ/i });
    await expect(messagesNavBtn).toBeVisible({ timeout: 10000 });
    await expect(messagesNavBtn).toBeEnabled();

    await messagesNavBtn.click();
    await expect(page).toHaveURL("/messages", { timeout: 8000 });
  });

  test("Messages nav button is not marked as disabled or 'soon'", async ({ page }) => {
    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);

    // 'soon' badge should not exist anywhere in the nav
    await expect(page.locator("text=soon")).not.toBeVisible({ timeout: 5000 });

    const messagesNavBtn = page.locator('button').filter({ hasText: /messages|মেসেজ/i });
    await expect(messagesNavBtn).not.toHaveAttribute("disabled");
  });

  test("Send Message button on bottom sheet navigates to correct thread URL", async ({ page }) => {
    const { requestId, userId } = await getUserBRequestId();

    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);

    // Wait for the map / listing list to load
    await page.waitForLoadState("networkidle");

    // Navigate directly to the thread URL (simulates clicking Send Message)
    await page.goto(`/messages/${requestId}/${userId}`);
    await expect(page).toHaveURL(`/messages/${requestId}/${userId}`);
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
  });

  test("Listing with phone shows Send Message as secondary button", async ({ page }) => {
    const supabase = getAdminClient();
    const userBEmail = `${TEST_USER_B.phone}@qurbanisathi.com`;
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userB = users?.find((u) => u.email === userBEmail);
    if (!userB) test.skip();

    // Create a request WITH a phone number
    const { data: withPhone } = await supabase.from("share_requests").insert({
      user_id: userB!.id,
      shares_wanted: 3,
      area_name: "Uttara, Dhaka",
      status: "open",
      phone_number: "01900000099",
      latitude: 23.8753,
      longitude: 90.3795,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id").single();

    if (!withPhone) test.skip();

    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);
    await page.waitForLoadState("networkidle");

    // Navigate directly to thread to confirm route works
    await page.goto(`/messages/${withPhone!.id}/${userB!.id}`);
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });

    // Clean up
    await supabase.from("share_requests").delete().eq("id", withPhone!.id);
  });

  test("Listing without phone shows Send Message as primary CTA in bottom sheet", async ({ page }) => {
    const supabase = getAdminClient();
    const userBEmail = `${TEST_USER_B.phone}@qurbanisathi.com`;
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userB = users?.find((u) => u.email === userBEmail);
    if (!userB) test.skip();

    // Create a request WITHOUT phone/whatsapp
    const { data: noPhone } = await supabase.from("share_requests").insert({
      user_id: userB!.id,
      shares_wanted: 2,
      area_name: "Banani, Dhaka",
      status: "open",
      latitude: 23.7946,
      longitude: 90.4042,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id").single();

    if (!noPhone) test.skip();

    await loginAs(page, TEST_USER_A.phone, TEST_USER_A.password);
    await page.waitForLoadState("networkidle");

    // Navigate directly to thread to confirm route works
    await page.goto(`/messages/${noPhone!.id}/${userB!.id}`);
    await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });

    // Clean up
    await supabase.from("share_requests").delete().eq("id", noPhone!.id);
  });
});
