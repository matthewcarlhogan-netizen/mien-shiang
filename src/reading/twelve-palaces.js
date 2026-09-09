/*
 * MODULE A — Twelve Palaces (十二宮).
 *
 * DR-2026-09-09-R8-TWELVE-PALACES-RESTORED supersedes this construct's
 * earlier universal WITHHELD_PENDING_SOURCE_REVIEW state and the R8
 * suppression mechanism that preceded it. Two separate product-owner
 * decisions govern what follows, and they are different in kind:
 *
 * 1. NAMING (settled, no ambiguity). 妻妾宮 and 奴僕宮 are rendered literally
 *    — "Wife/Concubine Palace" and "Servant Palace" — never suppressed, never
 *    modernised. The source is not softened because a name is uncomfortable.
 *    Romanised forms (e.g. "Qiqie Gong") appear in the strings below rather
 *    than the Han characters themselves: `tests/ui-language.test.js` pins a
 *    project-wide rule that reader-facing `src/` string literals stay
 *    English-only outside `heritage/` and `reading/provenance.js` — the same
 *    rule already governing every other Module A/Reflection Engine surface
 *    (see the fix to `src/qise/reflection-corpus.js` under this same DR). The
 *    literal Han characters are not hidden — they live uncensored in
 *    `src/heritage/evidence.js`'s twelvePalaces record — only kept out of
 *    files this specific guard scans.
 *
 * 2. STRUCTURE (a genuinely separate question). This project's own strongest
 *    evidence (`src/heritage/evidence.js`'s VERIFIED_PRIMARY Taiqing Shenjian
 *    citation, folio <pb:KR3g0045_WYG_001_17b>) does not agree with the
 *    received/widely-circulated palace layout on two slots: the Wealth
 *    Palace sits at the forehead/jaw in Taiqing Shenjian, not the nose; and
 *    Taiqing Shenjian's twelfth slot is a general "Appearance" category, not
 *    a dedicated Property Palace at all (`evidence.js`'s open
 *    `twelve-palaces-twelfth-slot` / `twelve-palaces-constituents`
 *    disagreements, on record before this session). This is not an offence
 *    question; it is the app's own primary sources disagreeing with each
 *    other about where two palaces physically are. The precedent for that
 *    already exists in this same module family — `three-courts.js` ships
 *    `heritageReading: null` and a `sourcesDiffer` note rather than silently
 *    picking a boundary when its own sources conflict. Wealth and Property
 *    follow the identical rule here: the region stays in the layout and is
 *    reported as measured, but no heritage interpretation is asserted for
 *    either, and the disagreement is disclosed rather than resolved by
 *    omission.
 *
 * The other ten palaces have no such conflict between this project's sources
 * and carry real, tradition-attributed reading content, cited to the same
 * Taiqing Shenjian folio for name and location.
 */

const PALACE_LAYOUT = [
  {
    key: "life", name: "Life Palace",
    location: "between the brows", zone: "glabella",
    reading: "In the classical Twelve Palaces system (Taiqing Shenjian), the Life Palace (Ming Gong) is sited at the glabella and is traditionally read as an indicator of a person's overall spirit and fortune.",
  },
  {
    key: "wealth", name: "Wealth Palace",
    location: "the tip of the nose", zone: "nose_apex",
    reading: null,
    structuralNote:
      "Taiqing Shenjian places the Wealth Palace at the forehead and jaw, not the nose. The received layout " +
      "shown here follows the widely-circulated convention instead. Because this project's own strongest " +
      "evidence disagrees with that convention, no heritage reading is offered for this palace.",
  },
  {
    key: "siblings", name: "Siblings Palace",
    location: "the eyebrows", zones: ["eyebrow_right", "eyebrow_left"],
    reading: "Traditionally sited at the eyebrows (Taiqing Shenjian), the Siblings Palace (Xiongdi Gong) is associated in the classical system with relationships among brothers and sisters.",
  },
  {
    key: "property", name: "Property Palace",
    location: "the upper eyelids", zones: ["upper_eyelid_right", "upper_eyelid_left"],
    reading: null,
    structuralNote:
      "Taiqing Shenjian's twelve-palace sequence has no dedicated Property Palace at all — its twelfth slot is " +
      "a general \"Appearance\" category, not this one. The received layout shown here follows the " +
      "widely-circulated convention instead. Because this project's own strongest evidence disagrees with " +
      "that convention, no heritage reading is offered for this palace.",
  },
  {
    key: "children", name: "Children Palace",
    location: "beneath the eyes", zones: ["periorbital_right", "periorbital_left"],
    reading: "Traditionally sited beneath the eyes (Taiqing Shenjian), the Children Palace (Nannü Gong) is associated in the classical system with offspring and descendants.",
  },
  {
    // Rendered literally per product-owner decision — never suppressed or
    // modernised. See DR-2026-09-09-R8-TWELVE-PALACES-RESTORED. Source
    // name is 奴僕宮; Han characters live in src/heritage/evidence.js, not
    // in this reader-facing string per the project's English-only rule.
    key: "support", name: "Servant Palace",
    location: "the lower jaw and chin", zone: "chin",
    reading: "The Servant Palace (Nupu Gong) is sited at the chin and jaw (Taiqing Shenjian) and is associated in the classical system with one's relationships to subordinates and household staff.",
    translationNote: "The source name translates literally as \"servant\" or \"subordinate.\" It is rendered here as the primary source states it, not modernised.",
  },
  {
    // Rendered literally per product-owner decision — never suppressed or
    // modernised. See DR-2026-09-09-R8-TWELVE-PALACES-RESTORED. Source
    // name is 妻妾宮; Han characters live in src/heritage/evidence.js, not
    // in this reader-facing string per the project's English-only rule.
    key: "partner", name: "Wife/Concubine Palace",
    location: "the outer corners of the eyes", zones: ["outer_eye_right", "outer_eye_left"],
    reading: "The Wife/Concubine Palace (Qiqie Gong) is sited at the outer corners of the eyes — the \"fish-tail\" (Taiqing Shenjian) — and is associated in the classical system with marriage and partnership.",
    translationNote: "The source name explicitly names a polygynous relationship structure. \"Wife/Concubine Palace\" is a literal rendering, not a modern substitution such as a plain \"spouse\" gloss.",
  },
  {
    key: "trials", name: "Palace of Trials",
    location: "the bridge of the nose", zone: "nose_bridge",
    reading: "Traditionally sited at the bridge of the nose (Taiqing Shenjian), the Palace of Trials (Ji'e Gong) is associated in the classical system with hardship and adversity across a lifetime.",
  },
  {
    key: "travel", name: "Travel Palace",
    location: "the temples and the sides of the forehead", zones: ["temple_right", "temple_left"],
    reading: "Traditionally sited at the temples (Taiqing Shenjian), the Travel Palace (Qianyi Gong) is associated in the classical system with journeys and relocation.",
  },
  {
    key: "career", name: "Career Palace",
    location: "the centre of the forehead", zone: "center_forehead",
    reading: "Traditionally sited at the centre of the forehead (Taiqing Shenjian), the Career Palace (Guanlu Gong) is associated in the classical system with standing in public or official life.",
  },
  {
    key: "fortune", name: "Fortune Palace",
    location: "the upper sides of the forehead", zones: ["fortune_forehead_right", "fortune_forehead_left"],
    reading: "Traditionally sited at the upper forehead (Taiqing Shenjian), the Fortune Palace (Fude Gong) is associated in the classical system with blessings and the deeper stores of fortune.",
  },
  {
    key: "parents", name: "Parents Palace",
    location: "the upper forehead, left and right", zones: ["parent_forehead_right", "parent_forehead_left"],
    reading: "Traditionally sited at the sun and moon corners of the upper forehead (Taiqing Shenjian), the Parents Palace (Fumu Gong) is associated in the classical system with one's parents and elders.",
  },
];

export const PALACES = Object.freeze(PALACE_LAYOUT.map((palace) => {
  const structurallyDisputed = palace.reading === null;
  return Object.freeze({
    ...palace,
    heritageStatus: structurallyDisputed ? "WITHHELD_STRUCTURAL_DISAGREEMENT" : "RUNTIME_PROSE",
  });
}));

export const SOURCES_DIFFER =
  "Sources differ on two of the twelve palaces. Taiqing Shenjian places the Wealth Palace at the forehead " +
  "and jaw, not the nose, and has no dedicated Property Palace at all — its twelfth slot is a general " +
  "\"Appearance\" category instead. The layout shown here follows the widely-circulated convention for " +
  "those two regions, but offers no heritage reading for them rather than presenting content this " +
  "project's own strongest evidence contradicts. The other ten palaces are not affected by this " +
  "disagreement.";

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
    sourcesDiffer: SOURCES_DIFFER,
  };
}
