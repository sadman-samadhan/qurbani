import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { count, error } = await supabaseAdmin
      .from("share_requests")
      .update({ status: "expired" })
      .lt("expires_at", new Date().toISOString())
      .eq("status", "open");

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      expired_count: count 
    });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
