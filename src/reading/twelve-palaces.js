/*
 * MODULE A — the Twelve Palaces (十二宮).
 *
 * ── HALF OF THESE PALACES ARE NOT MEASURED, AND IT SAYS SO ─────────────────
 * Six of the twelve sit on features this build samples (the Seal Hall, the
 * nose tip and bridge, under the eyes, the central forehead, the chin). The
 * other six sit on the brows, eyelids, temples and outer eye corners, which
 * are not sampled zones. Those are listed with their traditional meaning and
 * marked plainly as not read from this photo.
 *
 * Inventing a reading for an unmeasured palace would be the same error as
 * emitting a severity for something the engine cannot see: it would let the
 * interface imply an examination that did not happen.
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
    location: "the eyebrows", zone: null,
    reading:
      "In Mian Xiang the brows are the Siblings Palace, read as the company a person keeps and the people " +
      "they count as their own, whether or not they were born to them.",
  },
  {
    key: "property", hanzi: "田宅宮", name: "Property Palace",
    location: "the upper eyelids", zone: null,
    reading:
      "Classical Chinese face reading gives the upper eyelids the Property Palace, read as home and what a " +
      "person builds to stay in rather than to pass through.",
  },
  {
    key: "children", hanzi: "男女宮", name: "Children Palace",
    location: "beneath the eyes", zone: "periorbital_left",
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
    location: "the outer corners of the eyes", zone: null,
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
    location: "the temples and the sides of the forehead", zone: null,
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
    location: "the upper sides of the forehead", zone: null,
    reading:
      "In Mian Xiang the upper forehead is the Fortune Palace, read as ease of mind and the quiet kind of " +
      "good luck the texts rate more highly than the loud kind.",
  },
  {
    key: "parents", hanzi: "父母宮", name: "Parents Palace",
    location: "the upper forehead, left and right", zone: null,
    reading:
      "Classical Chinese face reading reads the upper forehead as the Parents Palace — inheritance in the " +
      "broad sense, meaning what was handed on rather than what was earned.",
  },
];

/**
 * How the tradition reads a palace's appearance.
 *
 * Deliberately warm and non-fatalistic on every branch. The classical texts
 * are often blunt about a "dark" palace; a shadowed reading here describes a
 * season, never a verdict on a person or their future.
 */
export const TONE_GLOSS = {
  clear:
    "The texts read this palace as clear in this photo, which they associate with the area running easily " +
    "at the moment.",
  even:
    "The texts read this palace as even in this photo — neither prominent nor shadowed, which they regard " +
    "as the ordinary and unremarkable case.",
  shadowed:
    "The texts read this palace as shadowed in this photo, which they associate with attention having been " +
    "elsewhere lately. Classical writers read this as a season rather than a fixed state, and expect it to move.",
};

export const SOURCES_DIFFER =
  "Sources differ on this — the number and placement of the palaces is not settled. Twelve is the common " +
  "arrangement, but some Mian Xiang texts work with thirteen and others place the Partner and Travel " +
  "palaces on the same stretch of temple, which changes what each one reads.";

/** Shadow/clarity thresholds on the zone's pigment difference from baseline. */
export const PALACE_TONE_DELTA = 1.5;

function toneFor(zoneScalars) {
  if (!zoneScalars || !Number.isFinite(zoneScalars.deltaMi)) return null;
  if (zoneScalars.deltaMi > PALACE_TONE_DELTA) return "shadowed";
  if (zoneScalars.deltaMi < -PALACE_TONE_DELTA) return "clear";
  return "even";
}

/**
 * @param {object} raw `rawScalars()` output — Module A consumes the neutral
 *        scalar layer, never the labelled one.
 */
export function readTwelvePalaces(raw) {
  const zones = raw?.zones ?? {};

  const palaces = PALACES.map((p) => {
    const supported = Boolean(p.zone);
    const measured = Boolean(supported && zones[p.zone]);
    const tone = measured ? toneFor(zones[p.zone]) : null;
    return {
      ...p,
      supported,
      measured,
      tone,
      toneGloss: tone ? TONE_GLOSS[tone] : null,
      /** Stated for every unmeasured palace, every time. */
      notMeasuredNote: measured
        ? null
        : (supported
          ? "This supported palace could not be measured clearly enough in this photo, so no reading is guessed for it."
          : "This palace sits on a part of the face this reading doesn't sample, so its meaning is given " +
            "here but nothing has been read from your photo for it."),
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
