/*
 * MODULE A — reading composition.
 *
 * Assembles the four readings from the two sources Module A is allowed to see:
 *
 *   geometry.js                 proportions and face shape
 *   adapters/entertainment.js   glow / vitality values
 *
 * It does NOT touch `analyse()`, the observation list, or anything else that
 * carries a condition name. Module B's output travels separately and is never
 * merged into this object — the UI renders it under its own disclaimer.
 */

/**
 * First reference, shown above the reading.
 *
 * The product is called Mien Shiang; the scholarly romanisation of 面相 is
 * Mian Xiang, and the reading copy uses that throughout. This line establishes
 * the term once so the two spellings are not read as two different things.
 */
export const READING_LEAD =
  "Read in the Mian Xiang (面相) tradition — classical Chinese face reading. " +
  "Everything below describes what a tradition says, not what is true of you.";

import { readFiveElements } from "./five-elements.js";
import { readThreeCourts } from "./three-courts.js";
import { readTwelvePalaces } from "./twelve-palaces.js";
import { readQiSe } from "./qi-se.js";
import { readHarmony } from "./harmony.js";
import { READING_PROVENANCE_IDS } from "./provenance.js";

/**
 * @param {object} geometry    geometryReport() output
 * @param {object} complexion  readComplexion() output (Module A adapter)
 * @param {object} raw         rawScalars() output — neutral scalars only
 */
export function composeReading(geometry, complexion, raw) {
  return {
    module: "A",
    provenanceIds: READING_PROVENANCE_IDS,
    fiveElements: geometry ? readFiveElements(geometry) : null,
    threeCourts: geometry ? readThreeCourts(geometry) : null,
    twelvePalaces: raw ? readTwelvePalaces(raw) : null,
    qiSe: complexion ? readQiSe(complexion) : null,
    harmony: geometry ? readHarmony(geometry, raw) : null,
  };
}

export { readFiveElements, readThreeCourts, readTwelvePalaces, readQiSe, readHarmony };
export { READING_PROVENANCE_IDS } from "./provenance.js";
