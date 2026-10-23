import { createHash, timingSafeEqual } from "node:crypto";

export function allowlist(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Empty allowlist fails closed — a missing env var must not open the app. */
export function isAllowedEmail(email: string | null | undefined): boolean {
  const list = allowlist();
  return list.length > 0 && list.includes((email ?? "").toLowerCase());
}

/** Constant-time bearer check. An empty secret never matches. */
export function bearerOk(header: string | null, secret: string | undefined): boolean {
  const given = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

