import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { MwError, mwGet, mwSearch } from "@/lib/musclewiki";

/**
 * GET /api/exercises/search?q=...
 * Searches MuscleWiki, caches hits in public.exercises, returns the cached rows.
 * ponytail: up to 10 upstream calls per search (1 search + ≤9 details). TESTING tier = 1,000/month; the library UI
 * only calls this on explicit "search MuscleWiki" taps, DB search is the default.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const admin = createAdminClient();
  try {
    const { results } = await mwSearch(q, 9);
    const ids = results.map((r) => String(r.id));
    const { data: cached } = await admin.from("exercises").select("source_id").eq("source", "musclewiki").in("source_id", ids);
    const have = new Set((cached ?? []).map((c) => c.source_id));
    const missing = results.filter((r) => !have.has(String(r.id)));
    if (missing.length) {
      const rows = await Promise.all(missing.map((r) => mwGet(r.id)));
      await admin.from("exercises").upsert(rows, { onConflict: "source,source_id" });
    }
    const { data } = await admin.from("exercises").select("*").eq("source", "musclewiki").in("source_id", ids);
    return NextResponse.json({ results: data ?? [] });
  } catch (e) {
    const status = e instanceof MwError ? e.status : 500;
    return NextResponse.json({ results: [], upstream: "unavailable", status }, { status: 200 });
  }
}
