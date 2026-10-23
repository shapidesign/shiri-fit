import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/** Service-role client. Server only. Bypasses RLS — use for cron, token storage, exercise cache. */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
