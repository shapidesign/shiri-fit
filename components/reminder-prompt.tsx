"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { PushToggle } from "@/components/push-toggle";
import { useProfile } from "@/components/profile-provider";
import { db } from "@/lib/db";

/** Offered right after something gets scheduled; pushes come from /api/reminders/tick. */
export function ReminderPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile } = useProfile();

  async function setLead(v: number) {
    const prev = profile;
    setProfile({ ...profile, reminder_minutes_before: v });
    const { error } = await db().from("profiles").update({ reminder_minutes_before: v }).eq("id", profile.id);
    if (error) { setProfile(prev); alert("השמירה נכשלה"); }
  }

  return (
    <Sheet open={open} onClose={onClose} title="רוצה תזכורת לפני כל אימון?">
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-muted"><Bell className="h-4 w-4" aria-hidden /> התראה לטלפון לפני כל אימון משובץ.</p>
        <PushToggle />
        <Stepper label="להזכיר לפני האימון" value={profile.reminder_minutes_before} onChange={setLead} min={0} max={240} step={15} suffix="דק׳" />
        <Button size="lg" className="w-full" onClick={onClose}>סיום</Button>
      </div>
    </Sheet>
  );
}
