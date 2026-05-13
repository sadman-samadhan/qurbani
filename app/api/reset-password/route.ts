import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, phone, answer, token, newPassword } = body;

    if (action === "generate-token") {
      // 1. Verify security answer
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("id, security_answer")
        .eq("phone", phone)
        .single();

      if (fetchError || !profile) {
        return NextResponse.json({ error: "অ্যাকাউন্ট পাওয়া যায়নি" }, { status: 404 });
      }

      if (profile.security_answer !== answer.toLowerCase().trim()) {
        return NextResponse.json({ error: "উত্তরটি সঠিক নয়" }, { status: 400 });
      }

      // 2. Generate short-lived token
      const resetToken = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          reset_token: resetToken,
          reset_token_expires_at: expiresAt,
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      return NextResponse.json({ token: resetToken });
    }

    if (action === "reset-password") {
      // 1. Verify token
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("id, reset_token, reset_token_expires_at")
        .eq("phone", phone)
        .single();

      if (fetchError || !profile) {
        return NextResponse.json({ error: "অ্যাকাউন্ট পাওয়া যায়নি" }, { status: 404 });
      }

      if (profile.reset_token !== token || new Date() > new Date(profile.reset_token_expires_at)) {
        return NextResponse.json({ error: "লিঙ্ক বা টোকেন মেয়াদোত্তীর্ণ" }, { status: 400 });
      }

      // 2. Update auth password
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        { password: newPassword }
      );

      if (authError) throw authError;

      // 3. Clear token
      await supabaseAdmin
        .from("profiles")
        .update({
          reset_token: null,
          reset_token_expires_at: null,
        })
        .eq("id", profile.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Reset password API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
