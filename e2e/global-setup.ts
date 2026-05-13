import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[global-setup] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping test data setup."
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Clean up messages from previous test runs to avoid stale state
  const userAPhone = process.env.TEST_USER_A_PHONE || "01700000001";
  const userBPhone = process.env.TEST_USER_B_PHONE || "01700000002";

  const userAEmail = `${userAPhone}@qurbanisathi.com`;
  const userBEmail = `${userBPhone}@qurbanisathi.com`;

  // Resolve user IDs from profiles via auth
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userA = users?.find((u) => u.email === userAEmail);
  const userB = users?.find((u) => u.email === userBEmail);

  if (!userA || !userB) {
    console.warn(
      "[global-setup] Test users not found in Supabase. Create them manually or via the app before running E2E tests.\n" +
      `  User A: phone=${userAPhone}, email=${userAEmail}\n` +
      `  User B: phone=${userBPhone}, email=${userBEmail}`
    );
    return;
  }

  // Delete test messages between these two users
  await supabase
    .from("messages")
    .delete()
    .or(
      `and(sender_id.eq.${userA.id},receiver_id.eq.${userB.id}),` +
      `and(sender_id.eq.${userB.id},receiver_id.eq.${userA.id})`
    );

  // Ensure userB has at least one open share_request
  const { data: existing } = await supabase
    .from("share_requests")
    .select("id")
    .eq("user_id", userB.id)
    .eq("status", "open")
    .limit(1);

  if (!existing || existing.length === 0) {
    // Fetch userB's location from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", userB.id)
      .single();

    await supabase.from("share_requests").insert({
      user_id: userB.id,
      shares_wanted: 2,
      area_name: "Mirpur, Dhaka",
      status: "open",
      latitude: profile?.latitude ?? 23.8103,
      longitude: profile?.longitude ?? 90.4125,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  console.log("[global-setup] Test data ready.");
}

export default globalSetup;
