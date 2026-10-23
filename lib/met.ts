import type { Intensity, Vibe } from "./types";

/**
 * Calorie estimate: kcal = MET × kg × hours.
 * MET values from the 2024 Compendium of Physical Activities (Ainsworth et al.), moderate effort.
 * Intensity scales ±20%. ponytail: no heart-rate / age / sex correction — MET×kg×h is the standard
 * consumer-app approximation and is within ~15% of lab values for these activities.
 */
export const MET: Record<Vibe, number> = {
  yoga: 2.8,      // hatha 2.5, power/vinyasa 4.0
  pilates: 3.0,
  stretch: 2.3,
  walk: 3.5,      // brisk ~5.5 km/h
  strength: 4.0,  // general resistance training (3.5 light – 6.0 vigorous)
  cardio: 6.0,    // generic aerobic class
  cycle: 6.8,     // leisure, 16–19 km/h
  swim: 6.0,      // leisurely laps
  hiit: 8.0,
  run: 8.3,       // ~8 km/h
  other: 4.0,
};

const INTENSITY_FACTOR: Record<Intensity, number> = { light: 0.8, moderate: 1, hard: 1.2 };

export function estimateCalories(opts: { vibe: Vibe; intensity?: Intensity; minutes: number; weightKg?: number | null }): number {
  const kg = opts.weightKg && opts.weightKg > 0 ? opts.weightKg : 60; // sane default if the profile has no weight yet
  const met = (MET[opts.vibe] ?? MET.other) * INTENSITY_FACTOR[opts.intensity ?? "moderate"];
  return Math.round(met * kg * (Math.max(0, opts.minutes) / 60));
}
