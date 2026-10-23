import Link from "next/link";

export function LegalDoc({
  title,
  kicker,
  updated,
  children,
}: {
  title: string;
  kicker: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 pb-16">
      <p className="text-sm font-semibold text-muted">{kicker}</p>
      <h1 className="mt-1 text-4xl font-black leading-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">{updated}</p>
      <div className="mt-8">{children}</div>
      <nav className="mt-12 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-6 text-sm text-muted">
        <Link href="/privacy" className="underline">מדיניות פרטיות</Link>
        <Link href="/terms" className="underline">תנאי שימוש</Link>
        <Link href="/login" className="underline">כניסה</Link>
      </nav>
    </main>
  );
}

export const heProse = "space-y-4 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pr-5 [&_a]:underline";
export const enProse = "mt-12 space-y-4 border-t border-border pt-10 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:underline";
