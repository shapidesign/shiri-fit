"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, CalendarRange, ChevronLeft, Dumbbell, House, NotebookPen, Plus, Sparkles, TrendingUp } from "lucide-react";
import { LogWorkoutSheet } from "@/components/log-workout-sheet";
import { NewWorkoutSheet } from "@/components/new-workout-sheet";
import { Sheet } from "@/components/ui/sheet";

const TABS = [
  { href: "/", label: "בית", Icon: House },
  { href: "/plan", label: "תוכנית", Icon: CalendarDays },
  { href: "/workouts", label: "תרגילים", Icon: Dumbbell },
  { href: "/progress", label: "התקדמות", Icon: TrendingUp },
];

export function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [single, setSingle] = useState(false);
  const [logging, setLogging] = useState(false);

  const tab = ({ href, label, Icon }: (typeof TABS)[number]) => {
    const active = href === "/" ? path === "/" : path.startsWith(href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold transition-colors ${
            active ? "bg-accent text-accent-ink" : "text-muted"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden strokeWidth={active ? 2.4 : 2} />
          {label}
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav aria-label="ניווט ראשי" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 pt-2">
          {TABS.slice(0, 2).map(tab)}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="חדש"
              className="-mt-6 grid h-16 w-16 place-items-center rounded-full bg-accent text-accent-ink shadow-[var(--shadow)] ring-4 ring-bg transition-transform active:scale-95"
            >
              <Plus className="h-8 w-8" strokeWidth={2.6} aria-hidden />
            </button>
          </li>
          {TABS.slice(2).map(tab)}
        </ul>
      </nav>

      <Sheet open={open} onClose={() => setOpen(false)} title="מה בונים?">
        <div className="space-y-2">
          <Option Icon={CalendarRange} title="תוכנית חודשית" sub="חודש של אימונים עם מטרה ויעד, משובץ בלוח" onClick={() => { setOpen(false); router.push("/plan/new"); }} accent />
          <Option Icon={Sparkles} title="אימון בודד" sub="לפי הזמן, סוג האימון והציוד שיש לך" onClick={() => { setOpen(false); setSingle(true); }} />
          <Option Icon={NotebookPen} title="תיעוד אימון שכבר עשיתי" sub="סטודיו, ריצה, משהו ספונטני" onClick={() => { setOpen(false); setLogging(true); }} />
        </div>
      </Sheet>
      <NewWorkoutSheet open={single} onClose={() => setSingle(false)} onScheduled={() => router.refresh()} />
      <LogWorkoutSheet open={logging} onClose={() => setLogging(false)} onSaved={() => location.reload()} />
    </>
  );
}

function Option({ Icon, title, sub, onClick, accent }: { Icon: typeof Plus; title: string; sub: string; onClick: () => void; accent?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl p-4 text-start transition-transform active:scale-[0.98] ${accent ? "bg-accent text-accent-ink" : "bg-surface"}`}>
      <Icon className="h-6 w-6 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className={`block text-xs ${accent ? "opacity-70" : "text-muted"}`}>{sub}</span>
      </span>
      <ChevronLeft className="h-5 w-5 shrink-0 opacity-60" aria-hidden />
    </button>
  );
}
