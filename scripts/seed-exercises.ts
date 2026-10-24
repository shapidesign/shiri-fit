/**
 * Seed public.exercises. Run once after the migration:
 *   npx tsx --env-file=.env.local scripts/seed-exercises.ts
 *
 * 1. free-exercise-db (public domain, 876 exercises with images) — always, with Hebrew names/steps from exercises-he.json.
 * 2. MuscleWiki curated subset (female videos + bodymaps) — only if MUSCLEWIKI_API_KEY has API access (TESTING+).
 * 3. ExerciseDB animated GIFs, attached to existing rows with the same name.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { fromFed, fromMw, nameKey, type FedExercise, type MwExercise } from "../lib/exercise-normalize";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function seedFed() {
  const res = await fetch("https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json");
  const all = (await res.json()) as FedExercise[];
  // ponytail: skip strongman/olympic lifts — not her thing. Everything else goes in.
  const keep = all.filter((e) => !["strongman", "olympic weightlifting", "powerlifting"].includes(e.category));
  const he = JSON.parse(readFileSync("scripts/exercises-he.json", "utf8")) as Record<string, { name_he: string; steps_he: string[] }>;
  const rows = keep.map(fromFed).map((r) => ({ ...r, ...he[r.source_id!] }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await admin.from("exercises").upsert(rows.slice(i, i + 200), { onConflict: "source,source_id" });
    if (error) throw error;
  }
  console.log(`free-exercise-db: upserted ${rows.length}`);
}

const MW = "https://api.musclewiki.com";
const KEY = process.env.MUSCLEWIKI_API_KEY;
const mw = async <T,>(path: string) => {
  const r = await fetch(MW + path, { headers: { "X-API-Key": KEY! } });
  if (!r.ok) throw new Error(`${r.status} ${path}: ${(await r.text()).slice(0, 120)}`);
  return r.json() as Promise<T>;
};

async function seedMuscleWiki() {
  if (!KEY) return console.log("musclewiki: no key, skipped");
  try {
    await mw("/exercises?limit=1");
  } catch (e) {
    return console.log(`musclewiki: skipped (${(e as Error).message})`);
  }
  const muscles = ["chest", "shoulders", "biceps", "triceps", "abdominals", "obliques", "lower back", "lats", "glutes", "quads", "hamstrings", "calves"];
  const categories = ["bodyweight", "dumbbells", "kettlebells", "band", "stretches", "yoga", "trx"];
  const ids = new Set<number>();
  for (const m of muscles) for (const c of categories) {
    try {
      const { results } = await mw<{ results: { id: number }[] }>(`/exercises?muscles=${encodeURIComponent(m)}&category=${encodeURIComponent(c)}&limit=6&gender=female`);
      results.forEach((r) => ids.add(r.id));
    } catch (e) { console.warn((e as Error).message); }
  }
  const { data: cached } = await admin.from("exercises").select("source_id").eq("source", "musclewiki");
  const have = new Set((cached ?? []).map((c) => c.source_id));
  const todo = [...ids].filter((id) => !have.has(String(id)));
  console.log(`musclewiki: ${ids.size} ids, ${todo.length} to fetch`);
  for (let i = 0; i < todo.length; i += 10) {
    const rows = await Promise.all(todo.slice(i, i + 10).map((id) => mw<MwExercise>(`/exercises/${id}?gender=female`).then(fromMw)));
    const { error } = await admin.from("exercises").upsert(rows, { onConflict: "source,source_id" });
    if (error) throw error;
  }
  console.log("musclewiki: done");
}

// ponytail: exact nameKey match covers ~30% of rows (datasets name things differently); add aliases or import unmatched rows if that's not enough.
async function seedExerciseDbGifs() {
  const res = await fetch("https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/src/data/exercises.json");
  if (!res.ok) return console.log(`exercisedb: skipped (${res.status})`);
  const gifs = new Map<string, string>();
  // Male-model variants only when nothing else has that name.
  for (const e of (await res.json()) as { name: string; gifUrl: string }[]) {
    const k = nameKey(e.name);
    if (!gifs.has(k) || !/\(male\)/i.test(e.name)) gifs.set(k, e.gifUrl);
  }
  const { data, error } = await admin.from("exercises").select("id, name").is("gif", null);
  if (error) throw error;
  const hits = (data ?? []).flatMap((e) => (gifs.has(nameKey(e.name)) ? [{ id: e.id, gif: gifs.get(nameKey(e.name))! }] : []));
  for (let i = 0; i < hits.length; i += 20) {
    const results = await Promise.all(hits.slice(i, i + 20).map((h) => admin.from("exercises").update({ gif: h.gif }).eq("id", h.id)));
    const failed = results.find((r) => r.error);
    if (failed) throw failed.error;
  }
  console.log(`exercisedb: ${hits.length}/${data?.length ?? 0} rows got a GIF`);
}

seedFed().then(seedMuscleWiki).then(seedExerciseDbGifs).catch((e) => { console.error(e); process.exit(1); });
