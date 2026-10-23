import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Logged-in user's profile, or redirect to /login. Creates the row if the auth trigger somehow missed it. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, email: user.email ?? null, display_name: (user.user_metadata?.full_name as string) ?? null })
    .select("*")
    .single();
  if (error || !created) throw error ?? new Error("profile create failed");
  return created;
}
