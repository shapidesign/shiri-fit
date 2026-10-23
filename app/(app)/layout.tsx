import { redirect } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";
import { ProfileProvider } from "@/components/profile-provider";
import { requireProfile } from "@/lib/profile.server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (!profile.onboarding_done) redirect("/onboarding");

  return (
    <ProfileProvider profile={profile}>
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">{children}</div>
      <BottomNav />
    </ProfileProvider>
  );
}
