/** Map a clock-face fraction (0 at 12, clockwise, 1 = back at 12) onto a minute total.
 * wrap: a drag that crosses 12 adds or drops an hour. A tap only moves the hand.
 * ponytail: one turn is an hour, and a single event jumping more than half a turn counts as a crossing. Finer tracking would need the gesture path. */
export function dialMinutes(current: number, prevFrac: number, frac: number, wrap: boolean, min: number, max: number): number {
  const f = ((frac % 1) + 1) % 1;
  let hours = Math.floor(current / 60);
  if (wrap) {
    const d = f - prevFrac;
    if (d < -0.5) hours += 1;
    if (d > 0.5) hours -= 1;
  }
  let mins = Math.round(f * 60);
  if (mins >= 60) mins = f >= 0.5 ? 59 : 0;
  return Math.min(max, Math.max(min, hours * 60 + mins));
}
