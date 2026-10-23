import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(`${origin}/login?error=oauth`);

  // Google only returns a refresh token on the consent screen; keep the last good one.
  const refresh = data.session.provider_refresh_token;
  if (refresh) {
    await createAdminClient()
      .from("google_tokens")
      .upsert({ user_id: data.session.user.id, refresh_token: refresh, updated_at: new Date().toISOString() });
  }

  return NextResponse.redirect(`${origin}/`);
}
