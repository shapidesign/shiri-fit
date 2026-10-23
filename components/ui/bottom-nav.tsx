"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, House, TrendingUp } from "lucide-react";

const TABS = [
  { href: "/", label: "בית", Icon: House },
  { href: "/plan", label: "תוכנית", Icon: CalendarDays },
  { href: "/workouts", label: "אימונים", Icon: Dumbbell },
  { href: "/progress", label: "התקדמות", Icon: TrendingUp },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="ניווט ראשי" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur safe-bottom">
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-2">
        {TABS.map(({ href, label, Icon }) => {
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
        })}
      </ul>
    </nav>
  );
}
