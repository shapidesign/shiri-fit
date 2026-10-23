"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CalendarCheck, LogOut, Pencil } from "lucide-react";
import { useProfile } from "@/components/profile-provider";
import { OnboardingForm } from "@/components/onboarding-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Stepper } from "@/components/ui/field";
import { PushToggle } from "@/components/push-toggle";
import { db } from "@/lib/db";
import { EQUIPMENT, GOALS, VIBES } from "@/lib/labels";

export default function ProfilePage() {
  const { profile, setProfile } = useProfile();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function patch(p: Partial<typeof profile>) {
    setProfile({ ...profile, ...p });
    await db().from("profiles").update(p).eq("id", profile.id);
  }

  async function signOut() {
    await db().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (editing) {
    return (
      <main>
        <PageHeader title="עריכת פרופיל" action={<Button size="sm" variant="secondary" onClick={() => setEditing(false)}>ביטול</Button>} />
        <OnboardingForm profile={profile} mode="edit" onSaved={(p) => { setProfile(p); setEditing(false); }} />
      </main>
    );
  }

  const label = (list: { id: string; label: string }[], ids: string[]) => ids.map((i) => list.find((x) => x.id === i)?.label ?? i).join(" · ") || "—";

  return (
    <main className="space-y-4">
      <PageHeader title={profile.display_name ?? "הפרופיל שלי"} eyebrow={profile.email ?? ""} back="/" />

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">הפרטים שלך</h2>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> עריכה</Button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">משקל</dt><dd className="font-semibold">{profile.weight_kg ?? "—"} ק״ג</dd>
          <dt className="text-muted">אימונים בשבוע</dt><dd className="font-semibold">{profile.days_per_week}</dd>
          {profile.weekly_minutes_goal && <><dt className="text-muted">יעד דקות</dt><dd className="font-semibold">{profile.weekly_minutes_goal} דק׳</dd></>}
          <dt className="text-muted">ציוד</dt><dd className="font-semibold">{label(EQUIPMENT, profile.equipment)}</dd>
          <dt className="text-muted">מטרות</dt><dd className="font-semibold">{label(GOALS, profile.goals)}</dd>
          <dt className="text-muted">אוהבת</dt><dd className="font-semibold">{label(VIBES, profile.vibes)}</dd>
        </dl>
      </Card>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Bell className="h-5 w-5" aria-hidden /> תזכורות</h2>
        <PushToggle />
        <Stepper label="להזכיר לפני האימון" value={profile.reminder_minutes_before} onChange={(v) => patch({ reminder_minutes_before: v })} min={0} max={240} step={15} suffix="דק׳" />
      </Card>

      <Card>
        <label className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-bold"><CalendarCheck className="h-5 w-5" aria-hidden /> סנכרון ליומן Google</span>
          <input type="checkbox" checked={profile.calendar_sync} onChange={(e) => patch({ calendar_sync: e.target.checked })} className="h-6 w-6 accent-[var(--accent)]" />
        </label>
        <p className="mt-1 text-xs text-muted">אימונים משובצים נכנסים ליומן, ואימונים ספונטניים נרשמים אחורה.</p>
      </Card>

      <Button variant="danger" className="w-full" onClick={signOut}><LogOut className="h-4 w-4" /> יציאה מהחשבון</Button>
    </main>
  );
}
