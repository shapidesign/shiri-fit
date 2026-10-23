const COLORS = ["var(--ring-1)", "var(--ring-2)", "var(--ring-3)"];
const RINGS = COLORS.map((c, i) => `<span class="cel-ring" style="--c:${c};--i:${i}"></span>`).join("");
const DOTS = Array.from({ length: 10 }, (_, i) => `<span class="cel-dot" style="--c:${COLORS[i % 3]};--a:${i * 36}deg"></span>`).join("");

/**
 * The one "done" moment (plan created, workout scheduled / finished / logged): badge pops, check draws, brand rings + dots burst.
 * Shown as a popover so it sits above any open sheet. Resolves when it's gone — or on tap — so callers can open the next sheet after.
 */
export function celebrate(label: string): Promise<void> {
  const el = document.createElement("div");
  el.className = "celebrate";
  el.setAttribute("popover", "manual");
  el.setAttribute("role", "status");
  el.innerHTML = `<div><div class="cel-badge">${RINGS}${DOTS}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><p class="cel-label"></p></div>`;
  document.body.append(el);
  el.showPopover?.();
  el.querySelector("p")!.textContent = label;
  navigator.vibrate?.(30);
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); el.remove(); resolve(); };
    const timer = setTimeout(done, matchMedia("(prefers-reduced-motion: reduce)").matches ? 900 : 1400);
    el.onclick = done;
  });
}
