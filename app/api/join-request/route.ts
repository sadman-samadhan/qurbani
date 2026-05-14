import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = cookies();
  
  // 1. Get current user from auth header
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

  // Initialize Service Role client to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { request_id, shares_taken } = await request.json();

    // 2. Validate shares_taken
    if (!request_id || !shares_taken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (shares_taken < 1 || shares_taken > 6) {
      return NextResponse.json({ error: "Shares must be between 1 and 6" }, { status: 400 });
    }

    // 3. Fetch the share_request — verify it's still 'open'
    const { data: shareRequest, error: fetchError } = await supabaseAdmin
      .from("share_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (fetchError || !shareRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 400 });
    }

    if (shareRequest.status !== "open") {
      return NextResponse.json({ error: "This listing is no longer active" }, { status: 400 });
    }

    // 4. Check capacity (shares_filled + shares_taken <= 7)
    if ((shareRequest.shares_filled + shares_taken) > 7) {
      return NextResponse.json({ error: "Not enough shares remaining" }, { status: 400 });
    }

    // 5. Check user isn't already a member
    const { data: existingMember } = await supabaseAdmin
      .from("request_members")
      .select("id")
      .eq("request_id", request_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "You have already joined this request" }, { status: 400 });
    }

    // 6. Block if user is the request owner
    if (user.id === shareRequest.user_id) {
      return NextResponse.json({ error: "You cannot join your own listing" }, { status: 400 });
    }

    // 7. Insert into request_members with status = 'pending'
    const { error: insertMemberError } = await supabaseAdmin
      .from("request_members")
      .insert({
        request_id,
        user_id: user.id,
        shares_taken,
        status: "pending"
      });

    if (insertMemberError) throw insertMemberError;

    // 8. Get all current APPROVED members of this request
    const { data: approvedMembers } = await supabaseAdmin
      .from("request_members")
      .select("user_id")
      .eq("request_id", request_id)
      .eq("status", "approved");

    const approverIds = new Set((approvedMembers || []).map(m => m.user_id));
    
    // Also include the original request owner
    approverIds.add(shareRequest.user_id);

    // Get applicant name for notifications
    const { data: applicantProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    
    const applicantName = applicantProfile?.full_name || "Someone";

    // 9. If there are NO approvers (should not happen based on step 8 adding the owner)
    // but following user logic for "auto-approve if no members yet"
    // We'll interpret this as: if ONLY the owner is there, we still need their approval.
    // However, if the user explicitly meant auto-approve if no OTHER members, we'd check size.
    // For now, if the owner is the ONLY approver, we proceed to point 10.
    
    if (approverIds.size === 0) {
      // Auto-approve immediately
      await supabaseAdmin
        .from("request_members")
        .update({ status: "approved" })
        .eq("request_id", request_id)
        .eq("user_id", user.id);

      // Notify the request owner
      await supabaseAdmin.from("notifications").insert({
        user_id: shareRequest.user_id,
        type: "member_joined",
        title: "New member joined",
        body: `${applicantName} joined your listing with ${shares_taken} shares`,
        data: { request_id, applicant_id: user.id, shares_taken }
      });

      return NextResponse.json({ status: "approved", message: "Joined successfully" });
    } else {
      // 10. Insert one join_approvals row per approver and send notifications
      const approvalEntries = Array.from(approverIds).map(approverId => ({
        request_id,
        applicant_id: user.id,
        approver_id: approverId,
        decision: "pending"
      }));

      const notificationEntries = Array.from(approverIds).map(approverId => ({
        user_id: approverId,
        type: "join_request",
        title: "New join request",
        body: `${applicantName} wants to join your listing with ${shares_taken} shares`,
        data: { request_id, applicant_id: user.id, shares_taken }
      }));

      await Promise.all([
        supabaseAdmin.from("join_approvals").insert(approvalEntries),
        supabaseAdmin.from("notifications").insert(notificationEntries)
      ]);

      return NextResponse.json({ 
        status: "pending", 
        message: "Your request has been sent to the group for approval." 
      });
    }

  } catch (err: any) {
    console.error("API Join Request Error:", err);
    return NextResponse.json({ error: "Unexpected error occurred" }, { status: 500 });
  }
}
