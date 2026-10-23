import { requireProfile } from "@/lib/profile.server";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await requireProfile();
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <OnboardingForm profile={profile} mode="onboarding" />
    </main>
  );
}
