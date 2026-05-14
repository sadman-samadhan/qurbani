import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = cookies();
  
  // 1. Authenticate sender
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { request_id, content } = await request.json();

    if (!request_id || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 2. Fetch all approved members and original owner
    const [membersRes, requestRes, senderRes] = await Promise.all([
      supabaseAdmin
        .from("request_members")
        .select("user_id")
        .eq("request_id", request_id)
        .eq("status", "approved"),
      supabaseAdmin
        .from("share_requests")
        .select("user_id")
        .eq("id", request_id)
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
    ]);

    if (requestRes.error) throw requestRes.error;

    const memberIds = (membersRes.data || []).map(m => m.user_id);
    const ownerId = requestRes.data.user_id;
    const senderName = senderRes.data?.full_name || "Someone";

    // Combine and deduplicate
    const recipientIds = Array.from(new Set([...memberIds, ownerId]))
      .filter(id => id !== user.id); // Remove sender

    if (recipientIds.length === 0) {
      // Just insert one row anyway if it's a 1-to-1 chat with no other members
      // (This handles the case before anyone has joined)
      // Actually, if sender is NOT owner, owner will be in the list.
      // If sender IS owner, and no members, the list is empty.
      return NextResponse.json({ sent_to: 0, message: "No other members to notify" });
    }

    // 3. Fan-out: Insert messages and notifications
    const messageEntries = recipientIds.map(id => ({
      sender_id: user.id,
      receiver_id: id,
      request_id,
      content
    }));

    const notificationEntries = recipientIds.map(id => ({
      user_id: id,
      type: "listing_message",
      title: "New message on listing",
      body: `${senderName}: ${content.substring(0, 60)}${content.length > 60 ? "..." : ""}`,
      data: { request_id, sender_id: user.id }
    }));

    await Promise.all([
      supabaseAdmin.from("messages").insert(messageEntries),
      supabaseAdmin.from("notifications").insert(notificationEntries)
    ]);

    return NextResponse.json({ sent_to: recipientIds.length });

  } catch (err: any) {
    console.error("Listing Message Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
