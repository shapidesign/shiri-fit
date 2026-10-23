"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signInWithGoogle } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function LoginInner() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const notAllowed = params.get("error") === "not_allowed";

  async function signIn() {
    setLoading(true);
    await signInWithGoogle();
  }

  return (
    <main className="flex min-h-dvh flex-col justify-between px-6 pb-10 pt-20">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
        <img src="/icons/icon.svg" alt="" width={72} height={72} className="mb-8 h-18 w-18" />
        <h1 className="text-5xl font-black leading-tight">Shiri Fit</h1>
        <p className="mt-3 text-lg text-muted">האימונים שלך, במקום אחד. בלי רעש.</p>
      </div>

      <div className="space-y-4">
        {notAllowed && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-danger">
            החשבון הזה לא מורשה להיכנס לאפליקציה.
          </p>
        )}
        <Button onClick={signIn} loading={loading} className="w-full">
          כניסה עם Google
        </Button>
        <p className="text-center text-sm text-muted">נבקש גישה ליומן כדי לשבץ אימונים.</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
