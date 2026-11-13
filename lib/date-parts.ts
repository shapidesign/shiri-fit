/** Two-digit year is 20xx. ponytail: workout dates stay in this century. */
export function isoFromParts(d: string, m: string, y: string): string | null {
  if (!/^\d{2}$/.test(d) || !/^\d{2}$/.test(m) || !/^\d{2}$/.test(y)) return null;
  const year = 2000 + Number(y);
  const month = Number(m);
  const day = Number(d);
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return `${year}-${m}-${d}`;
}

export function partsFromIso(iso: string): [string, string, string] {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return ["", "", ""];
  return [match[3], match[2], match[1].slice(2)];
}
