/*
 * Five Elements interaction readings — MODULE A entertainment surface.
 *
 * Maps pairs of elements to tradition-attributed descriptions of their
 * classical relationship in Chinese cosmology. Nothing here asserts a fact
 * about any person. All statements are about the interaction between ELEMENTS
 * as the tradition describes them, not about the readers who embody them.
 *
 * Copy rules (CLAUDE.md item 19):
 *   1. Tradition-attributed, never assertive of the reader.
 *   2. Source named inline — "Classical Chinese face reading", "Mian Xiang",
 *      "the classical texts".
 *   3. No health vocabulary.
 *   4. No verdict about any person.
 *
 * The copy guard scans INTERACTION_READINGS via MODULE_A_COPY in
 * tests/copy-guard.test.js — it is registered there and must stay registered.
 *
 * ── THE TWO CYCLES ──────────────────────────────────────────────────────────
 * Five Elements cosmology has two canonical cycles:
 *   相生 (sheng, generating): Wood→Fire→Earth→Metal→Water→Wood
 *   相剋 (ke, overcoming):    Wood→Earth→Water→Fire→Metal→Wood
 *
 * Every non-identical pair falls into exactly one of these four positions:
 *   sheng_ab — A generates B
 *   sheng_ba — B generates A
 *   ke_ab    — A overcomes B
 *   ke_ba    — B overcomes A
 *
 * Pure — no DOM, no imports. Everything here takes element strings and
 * returns plain objects, so it is testable under node --test with no browser.
 */

// Generating cycle: each key generates its value.
const SHENG = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
// Overcoming cycle: each key overcomes its value.
const KE    = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

/**
 * Tradition-attributed readings for each interaction type.
 *
 * Scanned by the copy guard — keep these registered in MODULE_A_COPY.
 */
export const INTERACTION_READINGS = {
  same: {
    title: "Same element",
    reading:
      "In Classical Chinese face reading, two faces sharing the same element are read as resonant — " +
      "two instruments in the same tuning. Mian Xiang associates this with a familiarity of rhythm, " +
      "where the classical texts note that sameness can be both a comfort and a mirror.",
  },
  sheng_ab: {
    title: "Generating 相生",
    reading:
      "In Classical Chinese face reading, these two elements stand in the generating relationship " +
      "(相生, sheng). The classical texts read the first as a quiet resource for the second — a " +
      "sustaining that asks nothing in return. Mian Xiang associates this pairing with steady " +
      "support rather than dramatic exchange.",
  },
  sheng_ba: {
    title: "Generating 相生",
    reading:
      "In Classical Chinese face reading, these two elements stand in the generating relationship " +
      "(相生, sheng), with the second quietly sustaining the first. The classical texts read this " +
      "as an easy current — Mian Xiang associates it with steadiness rather than friction.",
  },
  ke_ab: {
    title: "Overcoming 相剋",
    reading:
      "In Classical Chinese face reading, these two elements stand in the overcoming relationship " +
      "(相剋, ke). The classical texts read this not as destruction but as the pruning that keeps " +
      "growth from running past its form. Mian Xiang associates the overcoming cycle with " +
      "definition and contrast rather than conflict.",
  },
  ke_ba: {
    title: "Overcoming 相剋",
    reading:
      "In Classical Chinese face reading, these two elements stand in the overcoming relationship " +
      "(相剋, ke), with the second element acting as the structuring force. The classical texts read " +
      "this as a shaping rather than a diminishing — Mian Xiang associates it with edge and " +
      "contrast rather than opposition.",
  },
};

/** Valid element names accepted by readCompatibility. */
export const VALID_ELEMENTS = new Set(Object.keys(SHENG));

/**
 * Return the tradition-attributed interaction reading for two elements.
 *
 * @param {string} elementA  e.g. "wood"
 * @param {string} elementB  e.g. "fire"
 * @returns {{ type: string, title: string, reading: string } | null}
 *   null when either argument is not a recognised element name.
 */
export function readCompatibility(elementA, elementB) {
  if (!elementA || !elementB) return null;
  const a = elementA.toLowerCase();
  const b = elementB.toLowerCase();
  if (!VALID_ELEMENTS.has(a) || !VALID_ELEMENTS.has(b)) return null;

  if (a === b) return { type: "same",     ...INTERACTION_READINGS.same };
  if (SHENG[a] === b) return { type: "sheng_ab", ...INTERACTION_READINGS.sheng_ab };
  if (SHENG[b] === a) return { type: "sheng_ba", ...INTERACTION_READINGS.sheng_ba };
  if (KE[a]    === b) return { type: "ke_ab",    ...INTERACTION_READINGS.ke_ab };
  if (KE[b]    === a) return { type: "ke_ba",    ...INTERACTION_READINGS.ke_ba };
  // Every distinct pair in the Five Elements cycle falls into one of the four
  // positions above; this branch is unreachable with valid inputs.
  return null;
}
