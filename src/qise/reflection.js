/*
 * THE REFLECTION ENGINE.
 *
 * Contract §7 — three epistemic layers, kept apart in the data model and not
 * merely in the styling:
 *
 *   OBSERVATION  what the camera and the personal baseline can actually support
 *   HERITAGE     what a named source says, attributed, about a region
 *   REFLECTION   the deliberate placing of one beside the other
 *
 * The join is symbolic and the prose says so out loud. Nothing here infers a
 * heritage meaning from a measurement.
 *
 * ── WHY THE COMPONENTS ARE A REGISTRY AND NOT A FUNCTION BODY ──────────────
 * The obvious implementation is one `composeReading()` that reaches for
 * whatever it needs. It works, and it rots: the day someone adds a dimension —
 * season, capture streak, a second measured axis — they add it to the state,
 * forget one branch of the prose, and the new dimension is computed and
 * discarded. That is the exact defect this module was built to remove, so the
 * engine must not be able to be extended carelessly.
 *
 * Instead every component DECLARES the state fields it reads. That gives three
 * properties nothing else does:
 *
 *   1. `reading-collision.test.js` can prove, mechanically, that every field in
 *      READING_AFFECTING is consumed by at least one component AND that
 *      changing it actually moves the rendered text. A dimension that is
 *      computed but inert fails the build.
 *   2. Adding a dimension is adding a registry entry. The engine is untouched.
 *   3. `explain()` is free: the trace of which component produced which
 *      sentence, and which state fields drove it, is the registry itself. The
 *      product owes the user an answer to "why am I seeing this", and an
 *      answer assembled by hand would drift from the code within a release.
 *
 * ── WHY ABSTENTION SHORT-CIRCUITS RATHER THAN DEGRADES ─────────────────────
 * A component is allowed to return null. Every component that assumes the
 * observation succeeded returns null when `availability !== "read"`, so an
 * abstained reading cannot pick up a sentence that quietly presumes a
 * measurement happened. Contract §4 item 6 makes that a build failure, and it
 * is easier to make it structurally impossible than to test for it after.
 */

import {
  READING_AFFECTING, NON_READING_AFFECTING, stateKey, STATE_KEY_SEPARATOR,
} from "./reading-state.js";
import {
  ASCENDANT_SUBJECT, REGION_PLACE, DIRECTION_VERB, MAGNITUDE_QUALIFIER,
  HEADLINE, HISTORY_LINE, CONFIDENCE_VOICE, AVAILABILITY_LINE, OBSERVATION_SHAPES,
  HERITAGE, BRIDGE_OPENER, BRIDGE_ABSTAINED, REFLECTION, ROTATION_DISCLOSURE,
  SELF_REPORT_BRIDGE,
} from "./reflection-corpus.js";
import { seededIndex } from "./passages.js";

export const LAYERS = Object.freeze(["observation", "heritage", "reflection"]);

export const CORPUS_VERSION = "reflection-corpus-v1";
export const ENGINE_VERSION = "reflection-engine-v1";

const read = (s) => s.availability === "read";

/**
 * THE COMPONENT REGISTRY.
 *
 * `dependsOn` is a contract, not documentation: the collision test reads it.
 * A component that reads a field it did not declare will pass its own render
 * and fail the audit, which is the correct way round.
 */
/**
 * THE COMPONENT REGISTRY.
 *
 * `dependsOn` is a contract, not documentation: the collision test reads it.
 * A component that reads a field it did not declare will pass its own render
 * and fail the audit, which is the correct way round.
 *
 * `variants` returns every authored way of saying this component's part for
 * this state. They must be interchangeable in MEANING — same claim, same
 * confidence, same abstention, same relationship to the source — and different
 * in framing, cadence or angle. `reading-variation.test.js` enforces both
 * halves of that: equivalence within a set, distinctness between states.
 *
 * `render(s, i)` remains for callers that want one specific variant.
 */
export const COMPONENTS = Object.freeze([
  {
    id: "headline",
    layer: "observation",
    dependsOn: ["ascendant", "direction", "availability"],
    variants(s) {
      if (!read(s)) {
        return ["Today's reading is incomplete.", "There is no reading to give today."];
      }
      const byDirection = HEADLINE[s.ascendant] || HEADLINE.ping;
      return byDirection[s.direction] || byDirection.none || HEADLINE.ping.none;
    },
  },
  {
    id: "availability",
    layer: "observation",
    dependsOn: ["availability"],
    variants(s) {
      return AVAILABILITY_LINE[s.availability] || AVAILABILITY_LINE.read;
    },
  },
  {
    id: "observation",
    layer: "observation",
    dependsOn: ["ascendant", "region", "direction", "availability"],
    variants(s) {
      if (!read(s)) return [null];
      const parts = {
        subject: ASCENDANT_SUBJECT[s.ascendant] || ASCENDANT_SUBJECT.ping,
        place: REGION_PLACE[s.region] || REGION_PLACE.overall,
        verb: DIRECTION_VERB[s.direction] || DIRECTION_VERB.none,
        object: s.direction === "none"
          ? "the range your own recent readings have settled into"
          : "what has been usual for you lately",
      };
      return OBSERVATION_SHAPES.map((shape) => shape(parts));
    },
  },
  {
    id: "magnitude",
    layer: "observation",
    dependsOn: ["magnitudeBand", "availability"],
    variants(s) {
      if (!read(s)) return [null];
      return MAGNITUDE_QUALIFIER[s.magnitudeBand] || MAGNITUDE_QUALIFIER.level;
    },
  },
  {
    id: "history",
    layer: "observation",
    dependsOn: ["historyStage", "trajectory"],
    variants(s) {
      const byStage = HISTORY_LINE[s.historyStage] || HISTORY_LINE.establishing;
      return byStage[s.trajectory] || byStage.steady || [null];
    },
  },
  {
    id: "confidence",
    layer: "observation",
    dependsOn: ["confidenceBand"],
    variants(s) {
      return CONFIDENCE_VOICE[s.confidenceBand] || [null];
    },
  },
  {
    id: "heritage",
    layer: "heritage",
    dependsOn: ["heritageConstruct", "sourceLineage"],
    /*
     * DELIBERATELY SINGLE-VARIANT.
     *
     * Every other component may be re-angled. This one may not: it is a
     * paraphrase of a named source with a recorded edition, and rewording it
     * on the second viewing would make the app's account of what a Ming text
     * says depend on how often the user has opened it. Provenance is not a
     * surface to vary.
     */
    variants(s) {
      const construct = HERITAGE[s.heritageConstruct] || HERITAGE.threeSections;
      return [(construct[s.sourceLineage] || construct.primary).text];
    },
  },
  {
    id: "heritageNote",
    layer: "heritage",
    dependsOn: ["heritageConstruct", "sourceLineage"],
    variants(s) {
      const construct = HERITAGE[s.heritageConstruct] || HERITAGE.threeSections;
      return [(construct[s.sourceLineage] || construct.primary).note];
    },
  },
  {
    id: "bridge",
    layer: "reflection",
    dependsOn: ["availability"],
    variants(s) {
      return read(s) ? BRIDGE_OPENER : BRIDGE_ABSTAINED;
    },
  },
  {
    id: "reflection",
    layer: "reflection",
    dependsOn: ["heritageConstruct", "ascendant"],
    variants(s) {
      const byConstruct = REFLECTION[s.heritageConstruct] || REFLECTION.threeSections;
      return byConstruct[s.ascendant] || byConstruct.ping;
    },
  },
].map((c) => Object.freeze({ ...c, render: (s, i = 0) => c.variants(s)[i] ?? null })));

/**
 * THE ODOMETER.
 *
 * Variation is indexed, not sampled. Component i takes its variant from the
 * digit of `occurrence` in a mixed-radix number whose digits are the components'
 * variant counts — so occurrence 0, 1, 2 … walks every combination exactly once
 * before any repeats, and the number of readings a state can produce before it
 * must repeat is the product of its variant counts. That is a proof rather than
 * a measurement, which is what a hash-based pick could never give: a hash
 * repeats by the birthday bound long before the space is exhausted.
 *
 * The phase offset is seeded from the state key so two states with the same
 * shape do not march in lockstep through their variants.
 */
export function variationCycle(state) {
  return COMPONENTS.reduce((n, c) => n * Math.max(1, c.variants(state).length), 1);
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * A stride co-prime with the cycle, near the golden section of it.
 *
 * Walking the odometer one step at a time turns the lowest digit first, so
 * three consecutive occurrences changed only the headline and left four
 * sentences identical — technically non-repeating and obviously mechanical,
 * which is the failure mode the variation layer exists to avoid rather than
 * to satisfy on a technicality.
 *
 * Any stride co-prime with the cycle still visits every combination exactly
 * once before repeating, so the guarantee is untouched. Choosing one near
 * 0.618 of the cycle is the standard low-discrepancy trick: successive
 * occurrences land far apart, so several components move at once and two
 * consecutive readings differ in framing throughout rather than in one line.
 */
function coprimeStride(total) {
  if (total <= 2) return 1;
  let step = Math.max(1, Math.round(total * 0.6180339887));
  while (gcd(step, total) !== 1) step = (step % total) + 1;
  return step;
}

export function variantIndices(state, occurrence = 0) {
  const radices = COMPONENTS.map((c) => Math.max(1, c.variants(state).length));
  const total = radices.reduce((a, b) => a * b, 1);
  const offset = seededIndex(stateKey(state), total);
  const n = (((occurrence | 0) % total) + total) % total;
  const walk = (offset + n * coprimeStride(total)) % total;

  const out = [];
  let place = 1;
  for (const radix of radices) {
    out.push(Math.floor(walk / place) % radix);
    place *= radix;
  }
  return out;
}

/**
 * DECLARED EQUIVALENCES.
 *
 * Contract §4: intentional collisions may exist, but they must be explicit.
 * Each entry names the pair of state keys allowed to share a reading and the
 * reason. An accidental collision is a defect; a declared one is a decision
 * with an author. Empty by design — nothing has earned an exemption yet.
 *
 * @type {ReadonlyArray<{a:string,b:string,sharedReadingReason:string}>}
 */
export const DECLARED_EQUIVALENCES = Object.freeze([]);

/** Fields consumed by at least one component. */
export function consumedFields() {
  const seen = new Set();
  for (const c of COMPONENTS) for (const f of c.dependsOn) seen.add(f);
  return seen;
}

/**
 * Assemble a reading.
 *
 * Returns the layered parts, the flat text, the state key that produced it, and
 * the trace. The trace is the product feature "why am I seeing this", not a
 * debug aid — contract §15 tier 3 and §16 both require the system to be able to
 * answer it from the same data that produced the reading.
 */
export function composeReading(state, options = {}) {
  if (!state) throw new TypeError("composeReading needs an interpreted reading state");

  const key = stateKey(state);
  const occurrence = Number.isFinite(options.occurrence) ? Math.max(0, options.occurrence | 0) : 0;
  const indices = variantIndices(state, occurrence);
  const parts = [];
  const trace = [];

  COMPONENTS.forEach((component, i) => {
    const set = component.variants(state);
    const index = Math.min(indices[i], set.length - 1);
    const text = set[index];
    if (text === null || text === undefined || text === "") return;
    parts.push({ id: component.id, layer: component.layer, text });
    trace.push({
      id: component.id,
      layer: component.layer,
      drivenBy: component.dependsOn.map((f) => `${f}=${state[f]}`),
      // The variant is part of the answer to "why this wording", and it is
      // reproducible: same state, same occurrence, same index, always.
      variant: set.length > 1 ? `${index + 1} of ${set.length}` : "only",
    });
  });

  // §14 — self-report is additive, user-reported, and never part of identity.
  if (options.includeSelfReport !== false && state.selfReport) {
    const marks = Object.entries(state.selfReport)
      .filter(([k, v]) => SELF_REPORT_BRIDGE[k] && v)
      .map(([k, v]) => `${SELF_REPORT_BRIDGE[k]} as ${v}`);
    if (marks.length) {
      parts.push({
        id: "selfReport",
        layer: "observation",
        text: `${marks.join(", and ")} today. That is your own note, not something the camera found.`,
      });
      trace.push({ id: "selfReport", layer: "observation", drivenBy: ["selfReport (non-identity)"] });
    }
  }

  const byLayer = {};
  for (const layer of LAYERS) {
    byLayer[layer] = parts.filter((p) => p.layer === layer).map((p) => p.text);
  }

  return Object.freeze({
    stateKey: key,
    occurrence,
    variationCycle: variationCycle(state),
    parts,
    layers: byLayer,
    // The rotation disclosure sits outside the prose so a surface cannot drop
    // it while keeping the heritage passage. §13.
    rotationDisclosure: ROTATION_DISCLOSURE,
    text: parts.map((p) => p.text).join(" "),
    provenance: Object.freeze({
      engine: ENGINE_VERSION,
      corpus: CORPUS_VERSION,
      readingAffecting: READING_AFFECTING,
      nonReadingAffecting: NON_READING_AFFECTING,
    }),
    trace,
  });
}

/** The user-facing answer to "why am I seeing this?". Contract §15, §16. */
export function explainReading(composed) {
  if (!composed) return [];
  return composed.trace.map((t) => ({
    sentence: (composed.parts.find((p) => p.id === t.id) || {}).text || "",
    layer: t.layer,
    because: t.drivenBy,
  }));
}

/** Split a state key back into its fields. Used by the collision report. */
export function parseStateKey(key) {
  const out = {};
  for (const pair of String(key).split(STATE_KEY_SEPARATOR)) {
    const i = pair.indexOf("=");
    if (i > 0) out[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return out;
}
