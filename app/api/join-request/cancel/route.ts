import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = cookies();
  
  // 1. Authenticate current user
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
    const { request_id } = await request.json();

    if (!request_id) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    // 2. Find the request_members row for this user + request
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("request_members")
      .select("*")
      .eq("request_id", request_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "No join request found to cancel" }, { status: 404 });
    }

    // 3. If status is already 'approved'
    if (membership.status === "approved") {
      return NextResponse.json({ 
        error: "Cannot cancel an approved membership. Use 'Leave listing' instead." 
      }, { status: 400 });
    }

    // 4. Update request_members SET status = 'cancelled'
    const { error: updateError } = await supabaseAdmin
      .from("request_members")
      .update({ status: "cancelled" })
      .eq("id", membership.id);

    if (updateError) throw updateError;

    // 5. Delete all join_approvals rows for this applicant + request
    await supabaseAdmin
      .from("join_approvals")
      .delete()
      .eq("request_id", request_id)
      .eq("applicant_id", user.id);

    // 6. Notify all approvers that the applicant cancelled
    // First, find who was supposed to approve
    const { data: approvedMembers } = await supabaseAdmin
      .from("request_members")
      .select("user_id")
      .eq("request_id", request_id)
      .eq("status", "approved");
    
    // Also include the original owner
    const { data: shareRequest } = await supabaseAdmin
      .from("share_requests")
      .select("user_id")
      .eq("id", request_id)
      .single();

    const approverIds = new Set((approvedMembers || []).map(m => m.user_id));
    if (shareRequest) approverIds.add(shareRequest.user_id);

    // Get applicant name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    
    const applicantName = profile?.full_name || "An applicant";

    const notificationEntries = Array.from(approverIds).map(approverId => ({
      user_id: approverId,
      type: "join_cancelled",
      title: "Join request cancelled",
      body: `${applicantName} cancelled their join request.`,
      data: { request_id, applicant_id: user.id }
    }));

    if (notificationEntries.length > 0) {
      await supabaseAdmin.from("notifications").insert(notificationEntries);
    }

    return NextResponse.json({ success: true, message: "Request cancelled" });

  } catch (err: any) {
    console.error("Cancel Join Request Error:", err);
    return NextResponse.json({ error: "Unexpected error occurred" }, { status: 500 });
  }
}
