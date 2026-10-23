import { allowlist } from "@/lib/allowlist";
import { createAdminClient } from "@/lib/supabase/admin";

/** Sign out. Delete the auth user only when an allowlist is actually configured — an empty env var must not wipe accounts. */
export async function rejectUser(signOut: () => Promise<unknown>, userId: string) {
  await signOut();
  if (!allowlist().length) return;
  try {
    await createAdminClient().auth.admin.deleteUser(userId);
  } catch {
    // session is already cleared; a missing service key must not trap the redirect
  }
}
