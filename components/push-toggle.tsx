"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { db, userId } from "@/lib/db";

type State = "unsupported" | "needs-install" | "off" | "on" | "denied" | "loading";

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // iOS Safari only exposes Push once the PWA is installed to the home screen.
        const ios = /iphone|ipad/i.test(navigator.userAgent);
        const standalone = (navigator as Navigator & { standalone?: boolean }).standalone || matchMedia("(display-mode: standalone)").matches;
        return setState(ios && !standalone ? "needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setState("loading");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setState("denied");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
    const json = sub.toJSON();
    await db().from("push_subscriptions").upsert(
      { user_id: await userId(), endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      { onConflict: "endpoint" },
    );
    setState("on");
  }

  async function disable() {
    setState("loading");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await db().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "needs-install") return <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm">כדי לקבל תזכורות באייפון: שיתוף ← ״הוספה למסך הבית״, ואז לפתוח משם.</p>;
  if (state === "unsupported") return <p className="text-sm text-muted">הדפדפן הזה לא תומך בהתראות.</p>;
  if (state === "denied") return <p className="text-sm text-muted">ההתראות חסומות. אפשר לאשר מחדש בהגדרות הטלפון ← Shiri Fit.</p>;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">{state === "on" ? "תזכורות פעילות" : "תזכורות כבויות"}</span>
      <Button size="sm" variant={state === "on" ? "secondary" : "primary"} loading={state === "loading"} onClick={state === "on" ? disable : enable}>
        {state === "on" ? "כיבוי" : "הפעלת תזכורות"}
      </Button>
    </div>
  );
}
