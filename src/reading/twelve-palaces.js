/*
 * MODULE A — Twelve Palaces provisional scanner layout.
 *
 * The region map remains deterministic so old on-device readings can still be
 * opened and coverage can be reported. The chapter body and edition locators
 * have not cleared source review, so no palace assignment or interpretation is
 * eligible for reader-facing heritage prose. That hold is part of every record
 * returned below and the views must preserve it.
 */

export const PALACE_SOURCE_REVIEW_NOTE =
  "Heritage interpretation withheld: the Twelve Palaces chapter body has not cleared source review.";

const PALACE_LAYOUT = [
  { key: "life", name: "Life Palace", location: "between the brows", zone: "glabella" },
  { key: "wealth", name: "Wealth Palace", location: "the tip of the nose", zone: "nose_apex" },
  { key: "siblings", name: "Siblings Palace", location: "the eyebrows", zones: ["eyebrow_right", "eyebrow_left"] },
  { key: "property", name: "Property Palace", location: "the upper eyelids", zones: ["upper_eyelid_right", "upper_eyelid_left"] },
  { key: "children", name: "Children Palace", location: "beneath the eyes", zones: ["periorbital_right", "periorbital_left"] },
  { key: "support", name: "Support Palace", location: "the lower jaw and chin", zone: "chin" },
  { key: "partner", name: "Partner Palace", location: "the outer corners of the eyes", zones: ["outer_eye_right", "outer_eye_left"] },
  { key: "trials", name: "Palace of Trials", location: "the bridge of the nose", zone: "nose_bridge" },
  { key: "travel", name: "Travel Palace", location: "the temples and the sides of the forehead", zones: ["temple_right", "temple_left"] },
  { key: "career", name: "Career Palace", location: "the centre of the forehead", zone: "center_forehead" },
  { key: "fortune", name: "Fortune Palace", location: "the upper sides of the forehead", zones: ["fortune_forehead_right", "fortune_forehead_left"] },
  { key: "parents", name: "Parents Palace", location: "the upper forehead, left and right", zones: ["parent_forehead_right", "parent_forehead_left"] },
];

export const PALACES = Object.freeze(PALACE_LAYOUT.map((palace) => Object.freeze({
  ...palace,
  reading: null,
  heritageStatus: "WITHHELD_PENDING_SOURCE_REVIEW",
  sourceReviewNote: PALACE_SOURCE_REVIEW_NOTE,
})));

export const SOURCES_DIFFER =
  "Sources differ on the names and placement of the palaces. The chapter body and edition locators are " +
  "still under review, so this build does not turn the provisional layout into heritage prose.";

function zoneKeysFor(palace) {
  if (Array.isArray(palace.zones)) return palace.zones;
  return palace.zone ? [palace.zone] : [];
}

/**
 * @param {object} raw `rawScalars()` output — Module A consumes the neutral
 *        scalar layer, never the labelled one.
 */
export function readTwelvePalaces(raw) {
  const zones = raw?.zones ?? {};

  const palaces = PALACES.map((p) => {
    const zoneKeys = zoneKeysFor(p);
    const samples = zoneKeys.map((key) => zones[key]);
    const supported = zoneKeys.length > 0;
    const measured = supported && samples.every(Boolean);
    return {
      ...p,
      supported,
      measured,
      notMeasuredNote: measured
        ? null
        : "Region not available in this photo.",
    };
  });

  return {
    palaces,
    measuredCount: palaces.filter((p) => p.measured).length,
    supportedCount: palaces.filter((p) => p.supported).length,
    totalCount: palaces.length,
    heritageStatus: "WITHHELD_PENDING_SOURCE_REVIEW",
    sourceReviewNote: PALACE_SOURCE_REVIEW_NOTE,
    sourcesDiffer: SOURCES_DIFFER,
  };
}
