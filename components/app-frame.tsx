"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/ui/bottom-nav";

/** Hides the tab bar during a workout so the finish button sits on the bottom edge, not on top of the sets. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const session = path.startsWith("/session");
  return (
    <>
      <div className={`mx-auto w-full max-w-lg flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] ${session ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))]" : "pb-28"}`}>{children}</div>
      <BottomNav hideBar={session} />
    </>
  );
}
