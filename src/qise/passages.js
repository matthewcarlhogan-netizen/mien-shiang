/*
 * PHASE 8 — the passages.
 *
 * ── HOW THE CELLS ARE BUILT, AND WHERE THIS DEPARTS FROM THE BRIEF ─────────
 * The brief asks for templates keyed on (ascendant, magnitudeBand, ming/run
 * direction) with at least five variants per cell. Written flat that is
 * 6 x 3 x 5 = 90 cells and 450 passages of 40-70 words, and the honest
 * consequence of writing 450 of anything is that most of them are the same
 * paragraph with two adjectives moved.
 *
 * So a passage is COMPOSED from three keyed parts — the colour's reading, the
 * strength of its showing, and the course of lustre and moisture. Selection is
 * still keyed on the full triple, and every cell realises at least
 * 5 x 5 x 5 = 125 distinct passages rather than the five asked for. The
 * deviation is recorded in docs/QISE_NOTES.md.
 *
 * ── THE FOUR RULES EVERY STRING HERE OBEYS ─────────────────────────────────
 * 1. It opens with attribution. Never "This means".
 * 2. It describes what a tradition reads, never what is true of the reader.
 * 3. It carries no health vocabulary, and names no part of the body that a
 *    correspondence could be hung off. There is no organ mapping here and
 *    there is not going to be one: adding it is a request to become an
 *    ARTG-registered device, not a request for a feature.
 * 4. It makes no prediction. Nothing here says what tomorrow holds.
 *
 * The colour similes are Su Wen Ch. 17's own, and they are the reason the
 * palette looks the way it does. They are also the attribution: a passage that
 * cites the text it comes from is making a claim about the text.
 */

/** Every passage opens with this. It is the attribution, not decoration. */
export const ATTRIBUTION = "The tradition reads it this way —";

/**
 * The colour readings. Five per ascendant.
 *
 * Written to follow the lead above, so each begins mid-sentence in lower case.
 */
export const CORE = Object.freeze({
  chi: [
    "the classical texts prize a red like vermilion wrapped in white silk, and warn against the flat red of ochre. What those readers looked for was warmth with light still behind it",
    "in the Su Wen the favourable red is vermilion seen through white gauze, never the dull red of clay. Classical readers regarded the covering as the whole point of the observation",
    "classical face reading places red at the south of its five-colour compass, the direction of summer. The texts describe it as vermilion under white rather than as a colour laid on plainly",
    "the tradition distinguishes two reds and cares only about the distinction: vermilion behind silk, which the texts call favourable, and the flat red of ochre, which they pointedly do not",
    "in Mian Xiang red is read as the colour of expansion and of the outward-moving season. The Su Wen describes the favourable form as vermilion covered with white, never as bare pigment",
  ],
  huang: [
    "the classical reading of yellow looks for realgar seen through gauze rather than the dry yellow of loess. The texts return to that image often and regard the veiled version as favourable",
    "in the Su Wen a favourable yellow is realgar covered with fine cloth, an unfavourable one the colour of dry earth. Classical readers held that the two look alike and are not alike",
    "Mian Xiang places yellow at the centre of its compass, the position without a season, associated with what holds steady while other things turn. The texts describe the shade as covered rather than bare",
    "the tradition reads yellow as the colour of the centre and of late summer, and describes the favourable form through a covering: realgar under gauze, never loess. The image does the work",
    "classical face reading gives yellow the middle place among the five colours. What the Su Wen praises is realgar behind thin cloth; what it does not praise is the flat yellow of dust",
  ],
  qing: [
    "the texts describe a favourable qing as moistened jade with grey in it, and an unfavourable one as flat indigo. Classical readers regarded the moisture as the observation, not the hue",
    "in the Su Wen qing is the colour of the east and of spring, of things beginning rather than arrived. The favourable form is jade that has been dampened, set against a dull blue-green",
    "Mian Xiang reads qing as the colour of the rising season, and the classical description is specific: greyish jade with moisture on it, not indigo. Those readers weighed the sheen above the shade",
    "the tradition places qing at the east of its compass. The Su Wen's image is moistened jade rather than a plain blue-green, and classical readers took that difference as the point of the observation",
    "classical texts describe qing through a stone rather than a pigment — jade, damp, with grey through it. The comparison with flat indigo is drawn deliberately by readers interested in the contrast",
  ],
  bai: [
    "the classical description of white is a goose feather, and the contrast drawn against it is salt. Readers of the Su Wen took the softness of the first as a different observation entirely",
    "in the tradition white belongs to the west and to autumn, the season of drawing in. The favourable form the texts name is goose down rather than the whiteness of salt",
    "Mian Xiang places white at the west of its five-colour compass. The Su Wen describes what it prizes as feather-white and what it does not as salt-white, not as degrees of one thing",
    "the texts give white the autumn position and describe it through a feather: soft, with depth behind it. The unfavourable comparison is salt, which is bright and has nothing behind it at all",
    "classical face reading reads white as the colour of the inward-turning season. The image the Su Wen uses is a goose feather; the image it warns about is salt",
  ],
  hei: [
    "the Su Wen describes a favourable dark as the lustre of black varnish and an unfavourable one as the grey of charcoal. The texts ask whether light returns, not how dark it is",
    "in the tradition black sits at the north of the compass, with winter and with what is held in reserve. The classical image is lacquer rather than ash",
    "Mian Xiang reads dark tones through the Su Wen's comparison: varnish, which has depth and returns light, against greyish charcoal, which does not. Both are dark and the texts keep them apart",
    "classical face reading gives black the winter position, the season of keeping rather than spending. The favourable form the texts name is the gloss of dark lacquer, never the flatness of charcoal",
    "the texts describe the favourable dark as varnish — deep, with light coming back off it. The comparison drawn against it is dry charcoal, and classical readers took that gloss as the observation",
  ],
  ping: [
    "the classical texts have a name for a face showing no colour rising: 平, level. It is not an absence of a reading. In Mian Xiang it is the reading, and the commonest one",
    "in the tradition 平 means level or even, and it is what classical readers wrote down when nothing stood out. They regarded it as the ordinary state rather than as a failure to observe",
    "Mian Xiang calls this 平 — level. Classical face reading regarded an unremarkable day as unremarkable, and the texts do not reach for a colour when none of them is showing",
    "the classical word here is 平, level, and the texts use it without apology. Readers who worked this way expected most observations to be this one, and were not looking for something more interesting",
    "in the Su Wen's scheme nothing is ascendant today, which the texts call 平. That is a complete reading in the classical system rather than a gap in one, and the commonest entry recorded",
  ],
});

/**
 * How strongly the colour is showing, relative to this reader's own range.
 *
 * Never relative to anyone else's: there is no population here to compare
 * against, and these phrases must not sound as though there is.
 */
export const BAND = Object.freeze({
  slight: [
    "Today that colour sits a little outside its usual place.",
    "It is showing slightly more than these readings usually record.",
    "The showing today is faint, only just clear of the usual spread.",
    "Against the run of these readings it is a small step out.",
    "It is a mild showing, close to where these readings normally sit.",
  ],
  clear: [
    "Today it sits clearly outside the usual spread of these readings.",
    "The showing is distinct against the run of the last few weeks.",
    "It is well clear of where these readings normally fall.",
    "Against the usual spread this is a definite step out.",
    "The colour is showing plainly today rather than faintly.",
  ],
  marked: [
    "Today it sits well outside anything the recent readings have recorded.",
    "The showing is strong against the run of the last few weeks.",
    "It is far clear of the usual spread for these readings.",
    "Against the recent record this is a pronounced step out.",
    "The colour is showing about as strongly as these readings have held.",
  ],
  level: [
    "Nothing today is far enough from the usual spread to name.",
    "Every measure sits inside the range these readings normally cover.",
    "None of the five colours is showing beyond the ordinary spread.",
    "The readings today fall where they usually fall.",
    "Nothing stands out against the run of the last few weeks.",
  ],
});

/**
 * The course of lustre (明) and moisture (潤).
 *
 * The five keys cover the shapes the pair can take. `divergent` exists because
 * one rising while the other falls is a distinct observation and flattening it
 * into "mixed" would lose the only thing that distinguishes it.
 */
export const COURSE = Object.freeze({
  bothUp: [
    "Lustre and moisture are both up on the usual, which the texts group as one sign.",
    "Both 明 and 潤 read higher today; the classical texts regard that pair as one observation.",
    "Lustre and moisture run together and above the usual, as the old readers preferred.",
    "Both measures sit above their usual place, and the tradition reads them as a pair.",
    "明 and 潤 are both raised, which classical readers noted as one thing and not two.",
  ],
  bothDown: [
    "Lustre and moisture are both below the usual, which the texts also take as one observation.",
    "Both 明 and 潤 read lower today; the classical readers grouped that pair as one note.",
    "Lustre and moisture run together and below the usual for these readings.",
    "Both measures sit under their usual place, and the tradition takes them together.",
    "明 and 潤 are both down, which the old texts recorded as one observation.",
  ],
  lustreLed: [
    "Lustre is doing most of the moving today, with moisture near its usual place.",
    "明 is the measure that has shifted; 潤 sits about where it usually does.",
    "The change is mostly in lustre, and moisture has stayed near the usual.",
    "Lustre has moved and moisture has not, the lighter of the two shifts.",
    "Most of today's movement is in 明 rather than in 潤.",
  ],
  moistureLed: [
    "Moisture is doing most of the moving today, with lustre near its usual place.",
    "潤 is the measure that has shifted; 明 sits about where it usually does.",
    "The change is mostly in moisture, and lustre has stayed near the usual.",
    "Moisture has moved and lustre has not, which classical readers noted separately.",
    "Most of today's movement is in 潤 rather than in 明.",
  ],
  divergent: [
    "Lustre and moisture have moved opposite ways, which the texts take as its own observation.",
    "One of 明 and 潤 is up while the other is down, a distinct shape.",
    "The two measures have parted company today, one rising while the other falls.",
    "Lustre and moisture pull opposite ways, which the tradition folds into neither.",
    "明 has risen while 潤 has fallen, or the reverse, and the texts kept those apart.",
  ],
  level: [
    "Lustre and moisture both sit where these readings usually put them.",
    "Neither 明 nor 潤 has moved far from its usual place.",
    "Both measures are near the middle of their usual spread.",
    "Lustre and moisture are holding steady against the recent run.",
    "Neither measure has stepped outside where it normally falls.",
  ],
});

/**
 * Which course key describes today's lustre and moisture.
 *
 * Takes already-normalised z-scores, so "moved" means "moved relative to this
 * reader's own variation" rather than by some absolute amount.
 */
export function courseKey(mingZ, runZ, threshold = 1) {
  const m = typeof mingZ === "number" ? mingZ : 0;
  const r = typeof runZ === "number" ? runZ : 0;
  const mMoved = Math.abs(m) >= threshold;
  const rMoved = Math.abs(r) >= threshold;

  if (!mMoved && !rMoved) return "level";
  if (mMoved && rMoved) {
    if (m > 0 && r > 0) return "bothUp";
    if (m < 0 && r < 0) return "bothDown";
    return "divergent";
  }
  return mMoved ? "lustreLed" : "moistureLed";
}

/**
 * Deterministic pick, seeded from the reading's own timestamp.
 *
 * The same reading must always render the same passage. A random pick would
 * quietly rewrite history every time a screen was reopened, which turns a
 * record into a slot machine.
 */
export function seededIndex(seed, length) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % length;
}

/**
 * Build the passage for one reading.
 *
 * @param {{ascendant:string, band:string|null}} compass
 * @param {{ming:number, run:number}} z normalised lustre/moisture deltas
 * @param {string} seed usually the reading's timestamp
 */
export function passageFor(compass, z, seed) {
  const ascendant = (compass && compass.ascendant) || "ping";
  const cores = CORE[ascendant] || CORE.ping;
  const bandKey = ascendant === "ping" ? "level" : ((compass && compass.band) || "slight");
  const bands = BAND[bandKey] || BAND.slight;
  const course = COURSE[courseKey(z && z.ming, z && z.run)];

  // Three different offsets from one seed, so the parts vary independently
  // rather than marching in lockstep across readings.
  const core = cores[seededIndex(`${seed}|core`, cores.length)];
  const band = bands[seededIndex(`${seed}|band`, bands.length)];
  const tail = course[seededIndex(`${seed}|course`, course.length)];

  return {
    provenanceId: "qise-passages-v1",
    ascendant,
    band: bandKey,
    course: courseKey(z && z.ming, z && z.run),
    text: `${ATTRIBUTION} ${core}. ${band} ${tail}`,
  };
}

/** Words in a rendered passage. Used by the 40-70 word test. */
export const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;
