import { createClient } from "./supabase/server";
import { redirect } from "next/navigation";

/**
 * Returns the current session or null
 */
export async function getSession() {
  const supabase = createClient();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    return null;
  }
}

/**
 * Returns the current user profile or null
 */
export async function getProfile() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return profile;
}

/**
 * Throws a redirect if not authenticated
 * Useful for Server Components
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Returns true if current user is an admin
 */
export async function isAdmin() {
  const profile = await getProfile();
  return !!profile?.is_admin;
}
