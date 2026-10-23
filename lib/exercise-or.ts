/** PostgREST `.or()` filter. null when the query is only metacharacters. */
export function exerciseOr(q: string): string | null {
  const safe = q.replace(/[%_,().\\":*]/g, "").trim();
  return safe ? `name.ilike.%${safe}%,name_he.ilike.%${safe}%` : null;
}
