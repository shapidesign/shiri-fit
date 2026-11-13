import { redirect } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { ProfileProvider } from "@/components/profile-provider";
import { requireProfile } from "@/lib/profile.server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (!profile.onboarding_done) redirect("/onboarding");

  return (
    <ProfileProvider profile={profile}>
      <AppFrame>{children}</AppFrame>
    </ProfileProvider>
  );
}
