import "server-only";
import { fromMw, type MwExercise } from "./exercise-normalize";

const BASE = "https://api.musclewiki.com";

export class MwError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function mw<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const key = process.env.MUSCLEWIKI_API_KEY;
  if (!key) throw new MwError(401, "MUSCLEWIKI_API_KEY missing");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { "X-API-Key": key }, next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) throw new MwError(res.status, (await res.text()).slice(0, 200));
  return res.json();
}

export const mwSearch = (q: string, limit = 20) =>
  mw<{ results: { id: number; name: string }[] }>("/search", { q, limit });

export const mwList = (params: { muscles?: string; category?: string; difficulty?: string; limit?: number; offset?: number }) =>
  mw<{ total: number; results: { id: number; name: string }[] }>("/exercises", { gender: "female", ...params });

export const mwGet = async (id: number) => fromMw(await mw<MwExercise>(`/exercises/${id}`, { gender: "female" }));
