import { requireProfile } from "@/lib/profile.server";
import { createAdminClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await requireProfile();
  const { count } = await createAdminClient().from("google_tokens").select("user_id", { count: "exact", head: true }).eq("user_id", profile.id);
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <OnboardingForm profile={profile} mode="onboarding" calendarConnected={!!count} />
    </main>
  );
}
