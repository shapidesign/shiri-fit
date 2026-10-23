"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader, Segmented } from "@/components/ui/page-header";
import { ExerciseLibrary } from "@/components/exercise-library";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { listTemplates, type TemplateWithExercises } from "@/lib/db";
import { intensityLabel, muscleLabel, vibeLabel } from "@/lib/labels";
import type { Exercise } from "@/lib/types";

function WorkoutsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as "templates" | "library") ?? "templates";
  const [templates, setTemplates] = useState<TemplateWithExercises[] | null>(null);
  const [detail, setDetail] = useState<Exercise | null>(null);

  useEffect(() => { listTemplates().then(setTemplates); }, []);

  return (
    <main>
      <PageHeader
        title="אימונים"
        eyebrow="התבניות והתרגילים שלך"
        action={
          <Link href="/workouts/new" aria-label="תבנית חדשה" className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-ink active:scale-95">
            <Plus className="h-5 w-5" />
          </Link>
        }
      />
      <Segmented value={tab} onChange={(t) => router.replace(`/workouts?tab=${t}`)} options={[{ id: "templates", label: "התבניות שלי" }, { id: "library", label: "ספריית תרגילים" }]} />

      {tab === "templates" ? (
        templates === null ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-[24px] bg-surface" />)}</div>
        ) : templates.length === 0 ? (
          <Card tone="accent" className="text-center">
            <p className="text-lg font-bold">עוד אין תבניות</p>
            <p className="mt-1 text-sm text-muted">תבנית = אימון שחוזר על עצמו (למשל ״אימון A — כל הגוף״). בוני אחת ואז משבצים אותה בלוח.</p>
            <Link href="/workouts/new" className="mt-4 inline-flex h-12 items-center rounded-2xl bg-accent px-6 font-semibold text-accent-ink">תבנית ראשונה</Link>
          </Card>
        ) : (
          <ul className="space-y-3">
            {templates.map((t) => (
              <li key={t.id}>
                <Link href={`/workouts/${t.id}`} className="block rounded-[24px] bg-surface p-5 transition-transform active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted">{vibeLabel(t.vibe)} · {intensityLabel(t.intensity)} · {t.est_minutes} דק׳</p>
                      <h3 className="text-xl font-bold">{t.name}</h3>
                    </div>
                    <span className="rounded-full bg-bg px-3 py-1 text-xs font-semibold">{t.template_exercises.length} תרגילים</span>
                  </div>
                  {t.muscle_groups.length > 0 && <p className="mt-2 text-sm text-muted">{t.muscle_groups.map(muscleLabel).join(" · ")}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <ExerciseLibrary onSelect={setDetail} />
      )}

      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} onRename={setDetail} />
    </main>
  );
}

export default function WorkoutsPage() {
  return <Suspense><WorkoutsInner /></Suspense>;
}
