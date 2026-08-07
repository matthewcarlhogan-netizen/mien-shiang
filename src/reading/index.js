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

import { readFiveElements } from "./five-elements.js";
import { readThreeCourts } from "./three-courts.js";
import { readTwelvePalaces } from "./twelve-palaces.js";
import { readQiSe } from "./qi-se.js";

/**
 * @param {object} geometry    geometryReport() output
 * @param {object} complexion  readComplexion() output (Module A adapter)
 * @param {object} raw         rawScalars() output — neutral scalars only
 */
export function composeReading(geometry, complexion, raw) {
  return {
    module: "A",
    fiveElements: geometry ? readFiveElements(geometry) : null,
    threeCourts: geometry ? readThreeCourts(geometry) : null,
    twelvePalaces: raw ? readTwelvePalaces(raw) : null,
    qiSe: complexion ? readQiSe(complexion) : null,
  };
}

export { readFiveElements, readThreeCourts, readTwelvePalaces, readQiSe };
