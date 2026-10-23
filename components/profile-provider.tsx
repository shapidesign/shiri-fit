"use client";

import { createContext, useContext, useState } from "react";
import type { Profile } from "@/lib/types";

const Ctx = createContext<{ profile: Profile; setProfile: (p: Profile) => void } | null>(null);

export function ProfileProvider({ profile: initial, children }: { profile: Profile; children: React.ReactNode }) {
  const [profile, setProfile] = useState(initial);
  return <Ctx value={{ profile, setProfile }}>{children}</Ctx>;
}

export function useProfile() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProfile outside ProfileProvider");
  return v;
}
