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
    const { request_id, applicant_id, decision } = await request.json();

    if (!request_id || !applicant_id || !decision) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Verify current user is an approver for this join request
    const { data: approval, error: approvalError } = await supabaseAdmin
      .from("join_approvals")
      .select("*")
      .eq("request_id", request_id)
      .eq("applicant_id", applicant_id)
      .eq("approver_id", user.id)
      .single();

    if (approvalError || !approval) {
      return NextResponse.json({ error: "Forbidden: You are not an approver for this request" }, { status: 403 });
    }

    // 3. If already decided
    if (approval.decision !== "pending") {
      return NextResponse.json({ error: "You have already voted on this request" }, { status: 400 });
    }

    // 4. Update join_approvals
    const { error: updateError } = await supabaseAdmin
      .from("join_approvals")
      .update({ 
        decision, 
        decided_at: new Date().toISOString() 
      })
      .eq("id", approval.id);

    if (updateError) throw updateError;

    // 5. Wait 500ms then fetch updated request_members status
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: membership, error: memberError } = await supabaseAdmin
      .from("request_members")
      .select("*, share_requests(area_name, shares_filled, user_id)")
      .eq("request_id", request_id)
      .eq("user_id", applicant_id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "Membership record not found" }, { status: 500 });
    }

    const shareRequest = membership.share_requests;
    const applicantNameRes = await supabaseAdmin.from("profiles").select("full_name").eq("id", applicant_id).single();
    const applicantName = applicantNameRes.data?.full_name || "A member";

    // 6. If now 'approved'
    if (membership.status === "approved") {
      // Notify applicant
      await supabaseAdmin.from("notifications").insert({
        user_id: applicant_id,
        type: "join_approved",
        title: "Join request approved!",
        body: `You have been approved to join the listing in ${shareRequest.area_name} with ${membership.shares_taken} shares.`,
        data: { request_id, shares_taken: membership.shares_taken }
      });

      // Notify all other approved members
      const { data: otherMembers } = await supabaseAdmin
        .from("request_members")
        .select("user_id")
        .eq("request_id", request_id)
        .eq("status", "approved")
        .neq("user_id", applicant_id);

      const notifyOtherEntries = (otherMembers || []).map(m => ({
        user_id: m.user_id,
        type: "member_joined",
        title: "New member joined",
        body: `${applicantName} joined the listing with ${membership.shares_taken} shares. ${7 - shareRequest.shares_filled} shares left.`,
        data: { request_id, applicant_id, shares_taken: membership.shares_taken }
      }));
      
      // Also notify owner if they aren't in the members list (though they should be)
      const ownerInList = (otherMembers || []).some(m => m.user_id === shareRequest.user_id);
      if (!ownerInList && shareRequest.user_id !== applicant_id) {
        notifyOtherEntries.push({
          user_id: shareRequest.user_id,
          type: "member_joined",
          title: "New member joined",
          body: `${applicantName} joined your listing with ${membership.shares_taken} shares. ${7 - shareRequest.shares_filled} shares left.`,
          data: { request_id, applicant_id, shares_taken: membership.shares_taken }
        });
      }

      if (notifyOtherEntries.length > 0) {
        await supabaseAdmin.from("notifications").insert(notifyOtherEntries);
      }
    } 
    // 7. If now 'cancelled' (rejected)
    else if (membership.status === "cancelled") {
      await supabaseAdmin.from("notifications").insert({
        user_id: applicant_id,
        type: "join_rejected",
        title: "Join request not approved",
        body: `Your request to join the listing in ${shareRequest.area_name} was not approved.`,
        data: { request_id }
      });
    }

    return NextResponse.json({ 
      outcome: membership.status === "approved" ? "approved" : membership.status === "cancelled" ? "rejected" : "pending" 
    });

  } catch (err: any) {
    console.error("Respond Join Request Error:", err);
    return NextResponse.json({ error: "Unexpected error occurred" }, { status: 500 });
  }
}
