"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ExerciseLibrary } from "@/components/exercise-library";
import { ExerciseSheet } from "@/components/exercise-sheet";
import type { Exercise } from "@/lib/types";

export default function WorkoutsPage() {
  const [detail, setDetail] = useState<Exercise | null>(null);
  return (
    <main>
      <PageHeader title="תרגילים" eyebrow="ספריית התרגילים" />
      <ExerciseLibrary onSelect={setDetail} />
      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} onRename={setDetail} />
    </main>
  );
}
