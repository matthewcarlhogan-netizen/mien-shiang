/*
 * MODULE A — the Twelve Palaces (十二宮).
 *
 * ── COMPLETE, DETERMINISTIC LANDMARK MAPPING ────────────────────────────
 * Every palace is attached to one or two named MediaPipe landmark regions.
 * Bilateral palaces combine their left and right pigment deltas with a mean;
 * midline palaces use their single region. The same accepted frame therefore
 * always produces the same twelve readings: there is no random assignment,
 * manual unlock, pagination, or face-shape branch that can hide a palace.
 *
 * All twelve are reachable for every accepted face shape because the mapping
 * is anatomical rather than classificatory. Face shape affects the separate
 * Five Elements reading; it never decides whether a palace exists. If even one
 * required region is unavailable, the capture boundary asks for a clearer,
 * front-facing retry instead of inventing a value.
 *
 * ── ON 疾厄宮 ──────────────────────────────────────────────────────────────
 * The eighth palace is named for illness and adversity, and is usually
 * translated "Health Palace". This build reads it as the Palace of Trials and
 * takes only its adversity sense — what a person weathers and how they recover
 * — because Module A is the entertainment module and does not read health from
 * a face. The narrower reading is stated openly rather than quietly performed;
 * the translation note travels with the palace.
 */

export const PALACES = [
  {
    key: "life", hanzi: "命宮", name: "Life Palace",
    location: "between the brows", zone: "glabella",
    reading:
      "In Mian Xiang the Life Palace is the gate the whole reading passes through — the classical texts " +
      "regard it as the register of a person's general fortune and of how freely things move for them.",
  },
  {
    key: "wealth", hanzi: "財帛宮", name: "Wealth Palace",
    location: "the tip of the nose", zone: "nose_apex",
    reading:
      "Classical Chinese face reading places the Wealth Palace at the tip of the nose, and reads it as what " +
      "a person gathers and keeps — the texts are as interested in holding as in getting.",
  },
  {
    key: "siblings", hanzi: "兄弟宮", name: "Siblings Palace",
    location: "the eyebrows", zones: ["eyebrow_right", "eyebrow_left"],
    reading:
      "In Mian Xiang the brows are the Siblings Palace, read as the company a person keeps and the people " +
      "they count as their own, whether or not they were born to them.",
  },
  {
    key: "property", hanzi: "田宅宮", name: "Property Palace",
    location: "the upper eyelids", zones: ["upper_eyelid_right", "upper_eyelid_left"],
    reading:
      "Classical Chinese face reading gives the upper eyelids the Property Palace, read as home and what a " +
      "person builds to stay in rather than to pass through.",
  },
  {
    key: "children", hanzi: "男女宮", name: "Children Palace",
    location: "beneath the eyes", zones: ["periorbital_right", "periorbital_left"],
    reading:
      "In Mian Xiang the area beneath the eyes is the Children Palace, read as what a person tends and " +
      "brings on — the texts extend it to work and ideas raised as carefully as offspring.",
  },
  {
    key: "support", hanzi: "奴僕宮", name: "Support Palace",
    location: "the lower jaw and chin", zone: "chin",
    reading:
      "In Mian Xiang the lower jaw is the Support Palace, read as the help a person can call on and the " +
      "loyalty they attract from those around them.",
  },
  {
    key: "partner", hanzi: "妻妾宮", name: "Partner Palace",
    location: "the outer corners of the eyes", zones: ["outer_eye_right", "outer_eye_left"],
    reading:
      "Classical Chinese face reading places the Partner Palace at the outer eye corners, and reads it as " +
      "closeness and the weather of a person's nearest relationships.",
  },
  {
    key: "trials", hanzi: "疾厄宮", name: "Palace of Trials",
    location: "the bridge of the nose", zone: "nose_bridge",
    reading:
      "In Mian Xiang the bridge of the nose is read as what a person weathers and how they come back from " +
      "it — the classical texts associate a firm, even bridge with recovery and with keeping going.",
    translationNote:
      "The classical name 疾厄宮 is usually given as the Health Palace. This reading takes only its " +
      "adversity sense — what is weathered, and how — because this is a face reading and not anything else.",
  },
  {
    key: "travel", hanzi: "遷移宮", name: "Travel Palace",
    location: "the temples and the sides of the forehead", zones: ["temple_right", "temple_left"],
    reading:
      "In Mian Xiang the temples are the Travel Palace, read as movement and change of place, and as how " +
      "well a person does away from what they know.",
  },
  {
    key: "career", hanzi: "官祿宮", name: "Career Palace",
    location: "the centre of the forehead", zone: "center_forehead",
    reading:
      "Classical Chinese face reading gives the centre forehead the Career Palace, read as standing and " +
      "recognition — the texts are more interested in reputation than in position.",
  },
  {
    key: "fortune", hanzi: "福德宮", name: "Fortune Palace",
    location: "the upper sides of the forehead",
    zones: ["fortune_forehead_right", "fortune_forehead_left"],
    reading:
      "In Mian Xiang the upper forehead is the Fortune Palace, read as ease of mind and the quiet kind of " +
      "good luck the texts rate more highly than the loud kind.",
  },
  {
    key: "parents", hanzi: "父母宮", name: "Parents Palace",
    location: "the upper forehead, left and right",
    zones: ["parent_forehead_right", "parent_forehead_left"],
    reading:
      "Classical Chinese face reading reads the upper forehead as the Parents Palace — inheritance in the " +
      "broad sense, meaning what was handed on rather than what was earned.",
  },
];

export const SOURCES_DIFFER =
  "Sources differ on this — the number and placement of the palaces is not settled. Twelve is the common " +
  "arrangement, but some Mian Xiang texts work with thirteen and others place the Partner and Travel " +
  "palaces on the same stretch of temple, which changes what each one reads.";

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
