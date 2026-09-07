/*
 * PHASE 0 LIGHT-PROBE — the lamp schedule and its safety copy.
 *
 * ── WHY ~1.9 Hz, BLOCK-WISE ─────────────────────────────────────────────────
 * WCAG 2.x's general-flash guidance treats anything at or above 3 flashes per
 * second as a photosensitive-seizure risk to avoid outright. 1.9 Hz sits
 * below that with headroom, but the schedule is a hard on/off square wave
 * (block-wise), not a smooth ramp, aimed at a face at close range -- worth a
 * notice on its own terms even under the 3 Hz line.
 *
 * ── WHY THE COPY IS NOT ROUTED THROUGH THE MODULE A/B COPY GUARDS ──────────
 * This file lives outside src/, so it never reaches dist/ (scripts/build.js
 * only walks src/) and is never scanned by scripts/lint-bundle.js or
 * registered in tests/copy-guard.test.js's MODULE_A_COPY. That is correct --
 * this is not reading content, it is an instrumentation safety notice. It
 * still follows the same "no assertive second person" discipline as the rest
 * of the app's copy (CLAUDE.md item 19), checked here against the same
 * ASSERTIVE_PHRASES list scripts/copy-scan.js uses, so the two vocabularies
 * cannot drift apart by accident.
 */

export const LAMP_FREQUENCY_HZ = 1.9;
export const LAMP_PERIOD_MS = 1000 / LAMP_FREQUENCY_HZ;
export const LAMP_HALF_PERIOD_MS = LAMP_PERIOD_MS / 2;

export const PHOTOSENSITIVITY_NOTICE =
  "This instrument switches a bright light on and off in hard blocks, " +
  "about twice a second, for several seconds at a time, aimed toward the " +
  "camera. Flashing light at this rate is below common seizure-risk " +
  "thresholds, but anyone with a history of photosensitive seizures or " +
  "migraine should not run this probe. Stop immediately and look away if " +
  "any discomfort, dizziness or visual disturbance occurs.";
