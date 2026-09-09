/*
 * MODULE A — Twelve Palaces provisional scanner layout.
 *
 * The region map remains deterministic so old on-device readings can still be
 * opened and coverage can be reported. The chapter body and edition locators
 * have not cleared source review, so no palace assignment or interpretation is
 * eligible for reader-facing heritage prose. That hold is part of every record
 * returned below and the views must preserve it.
 *
 * R8 (DR-2026-09-09-B020-CLASS-BC-R3-R6-R8-R9) additionally and permanently
 * suppresses two of the twelve from ever reaching reader-facing interpretation,
 * independent of whether the broader source-review hold above is ever lifted:
 * the palaces corresponding to source-attested 妻妾宮 (explicitly polygynous)
 * and 奴僕宮 (servile). They stay in this layout — the region map, coverage
 * count and provenance record are unaffected — labelled here with neutral
 * English names ("Partner"/"Support") exactly as before. What R8 adds is the
 * `suppressedByR8` flag: a future change that lifts WITHHELD_PENDING_SOURCE_
 * REVIEW for the other ten must not lift it for these two without a SEPARATE
 * decision. See docs/OPTION_B_020_DISPOSITIONS.md §R8 and
 * docs/heritage-evidence/SOURCE_ACQUISITION_FINDINGS_2026-09-09.md for the two
 * independent primary sources that corroborate 妻妾宮/奴僕宮 as the
 * source-attested names (not 夫妻宮 or another modernisation) and the 魚尾
 * (fish-tail) location already reflected in "partner"'s zones below.
 */

export const PALACE_SOURCE_REVIEW_NOTE =
  "Heritage interpretation withheld: the Twelve Palaces chapter body has not cleared source review.";

export const R8_SUPPRESSION_NOTE =
  "Heritage interpretation permanently suppressed for this palace (DR-2026-09-09-B020-CLASS-BC-R3-R6-R8-R9): " +
  "retained in provenance records, never rendered as reader-facing prose.";

// Keys suppressed by R8, independent of the general source-review hold above.
export const R8_SUPPRESSED_PALACE_KEYS = Object.freeze(["partner", "support"]);

const PALACE_LAYOUT = [
  { key: "life", name: "Life Palace", location: "between the brows", zone: "glabella" },
  { key: "wealth", name: "Wealth Palace", location: "the tip of the nose", zone: "nose_apex" },
  { key: "siblings", name: "Siblings Palace", location: "the eyebrows", zones: ["eyebrow_right", "eyebrow_left"] },
  { key: "property", name: "Property Palace", location: "the upper eyelids", zones: ["upper_eyelid_right", "upper_eyelid_left"] },
  { key: "children", name: "Children Palace", location: "beneath the eyes", zones: ["periorbital_right", "periorbital_left"] },
  // R8: source-attested 奴僕宮 (servile). Suppressed — see R8_SUPPRESSED_PALACE_KEYS above.
  { key: "support", name: "Support Palace", location: "the lower jaw and chin", zone: "chin" },
  // R8: source-attested 妻妾宮 (explicitly polygynous), sited at 魚尾 (fish-tail) in both
  // corroborating sources. Suppressed — see R8_SUPPRESSED_PALACE_KEYS above.
  { key: "partner", name: "Partner Palace", location: "the outer corners of the eyes", zones: ["outer_eye_right", "outer_eye_left"] },
  { key: "trials", name: "Palace of Trials", location: "the bridge of the nose", zone: "nose_bridge" },
  { key: "travel", name: "Travel Palace", location: "the temples and the sides of the forehead", zones: ["temple_right", "temple_left"] },
  { key: "career", name: "Career Palace", location: "the centre of the forehead", zone: "center_forehead" },
  { key: "fortune", name: "Fortune Palace", location: "the upper sides of the forehead", zones: ["fortune_forehead_right", "fortune_forehead_left"] },
  { key: "parents", name: "Parents Palace", location: "the upper forehead, left and right", zones: ["parent_forehead_right", "parent_forehead_left"] },
];

export const PALACES = Object.freeze(PALACE_LAYOUT.map((palace) => {
  const suppressedByR8 = R8_SUPPRESSED_PALACE_KEYS.includes(palace.key);
  return Object.freeze({
    ...palace,
    reading: null,
    heritageStatus: "WITHHELD_PENDING_SOURCE_REVIEW",
    sourceReviewNote: PALACE_SOURCE_REVIEW_NOTE,
    suppressedByR8,
    ...(suppressedByR8 ? { r8SuppressionNote: R8_SUPPRESSION_NOTE } : {}),
  });
}));

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
