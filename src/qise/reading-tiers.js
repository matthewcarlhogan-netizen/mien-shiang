/*
 * TIERS 1–3 as a pure view model.
 *
 * Contract §15: the default daily experience stays fast, and the complexity
 * lives underneath it rather than in front of it. That is a layout decision,
 * but the SPLIT is not — which sentence belongs to Today and which belongs to
 * Why is a product rule, and product rules that live in DOM-writing code cannot
 * be tested and drift within a release.
 *
 * So the split is computed here, from the composed reading, and the view layer
 * only places strings. Tier 3 is assembled from the trace rather than written
 * separately, which is what keeps "why am I seeing this" honest: it cannot
 * describe a reading the engine did not produce, because it is made of the same
 * parts.
 */

import { LAYERS, heritageMaterialFor } from "./reflection.js";
import { READING_AFFECTING, NON_READING_AFFECTING } from "./reading-state.js";

const textsFor = (composed, ids) => composed.parts
  .filter((p) => ids.includes(p.id)).map((p) => p.text);

/** Tier 1 — Today. Observation and nothing else. Under a minute. */
export function tierOne(state, composed) {
  const headline = (composed.parts.find((p) => p.id === "headline") || {}).text || "";
  return {
    headline,
    body: textsFor(composed, ["availability", "observation", "magnitude"]),
    history: textsFor(composed, ["history"]),
    confidence: textsFor(composed, ["confidence"])[0] || "",
    selfReport: textsFor(composed, ["selfReport"])[0] || "",
    abstained: state.availability !== "read",
  };
}

/**
 * THE READER'S OWN MATERIAL, PROJECTED INTO TIER 2.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Tier 2 read only the heritage layer plus the bridge and the question. Those
 * four components depend on `heritageConstruct`, `sourceLineage`, `ascendant`
 * and `availability` — four axes of ten. The other six (region, direction,
 * magnitudeBand, confidenceBand, historyStage, trajectory) were computed by
 * the pipeline, carried on the state, rendered in Tier 1 and Tier 3, and then
 * silently dropped on the way to the Reading screen.
 *
 * Measured over all 15,288 reachable states, that produced 178 distinct Tier 2
 * outputs — 98.8% collision — and, worse, a fixed one: the same state returned
 * a byte-identical Tier 2 at every occurrence, so a reader in a steady week saw
 * the Reading screen never move while Today moved underneath it. That is the
 * exact defect `reading-state.js`'s header calls out — meaningful state
 * calculated and discarded — reappearing one layer up.
 *
 * ── WHY IT IS A PROJECTION, NOT AN INTERPRETATION ──────────────────────────
 * Every field here is a sentence `composeReading()` ALREADY produced, selected
 * by id out of `composed.parts`. Nothing is re-derived from the state, no new
 * signal is invented, and no wording exists here that does not exist in the
 * corpus. `tierOne()` reads the same parts by the same mechanism; this is a
 * second consumer of one composition, not a second composition. So the Reading
 * screen cannot describe a reading the engine did not produce — the property
 * `tierThree()` has always had, extended to Tier 2.
 *
 * ── WHY IT IS STRUCTURALLY SEPARATE FROM THE PASSAGE ───────────────────────
 * It is a nested object, not spread onto `tier2`, because §7's layer
 * separation has to survive into the surface: a view renders the reader's
 * record under its own heading and the attributed passage under its own, and
 * cannot accidentally interleave measurement prose into heritage prose by
 * iterating one flat bag of strings. `tier2.passage` is untouched by this.
 *
 * ── WHY AN ABSTAINED STATE STILL GETS ONE ──────────────────────────────────
 * `observation` and `magnitude` are `null` on every abstention, because
 * `deriveReadingState()` collapses the movement claim (see its header) and the
 * components return nothing — there is no observation to report and none is
 * fabricated. What the reader gets instead is `availability`, the corpus line
 * that says WHY, plus `absent`, the list of fields that could not be filled.
 * A surface can therefore state the gap rather than rendering a shorter block
 * and leaving the reader to notice something is missing.
 */
export const PERSONAL_CONTEXT_FIELDS = Object.freeze([
  "availability", "observation", "magnitude", "history", "confidence",
]);

export function personalContext(state, composed) {
  const filled = {};
  for (const field of PERSONAL_CONTEXT_FIELDS) {
    filled[field] = textsFor(composed, [field])[0] || null;
  }
  return Object.freeze({
    ...filled,
    read: state.availability === "read",
    // The reason for the gap, as a code beside the prose: a surface that wants
    // to branch on WHY must not have to pattern-match the sentence.
    availabilityCode: state.availability,
    absent: Object.freeze(PERSONAL_CONTEXT_FIELDS.filter((f) => !filled[f])),
  });
}

/** Tier 2 — Reading. The reader's own record, the heritage, then the bridge and the question. */
export function tierTwo(state, composed) {
  const material = heritageMaterialFor(state);
  return {
    // Structurally separate from `passage` and never merged into it — see the
    // `personalContext` header.
    personalContext: personalContext(state, composed),
    passage: composed.layers.heritage.join(" "),
    attribution: material.attribution,
    sourceStatus: material.abstained ? "WITHHELD_PENDING_SOURCE_REVIEW" : "RUNTIME_PROSE",
    sourceAbstained: material.abstained,
    // §13 — carried as its own field so a surface cannot keep the passage and
    // drop the disclosure that the passage was rotated rather than chosen.
    rotationDisclosure: composed.rotationDisclosure,
    bridge: textsFor(composed, ["bridge"])[0] || "",
    question: textsFor(composed, ["reflection"])[0] || "",
  };
}

/**
 * Tier 3 — Why / Study.
 *
 * Every sentence, the layer it came from, and the state values that produced
 * it. Plus what was measured, what was heritage, what was reflection — which is
 * the distinction §7 requires to survive into the UI rather than stopping at
 * the data model.
 */
export function tierThree(state, composed) {
  const byLayer = {};
  for (const layer of LAYERS) {
    byLayer[layer] = composed.trace
      .filter((t) => t.layer === layer)
      .map((t) => ({
        sentence: (composed.parts.find((p) => p.id === t.id) || {}).text || "",
        component: t.id,
        because: t.drivenBy,
      }));
  }

  return {
    stateKey: composed.stateKey,
    dimensions: READING_AFFECTING.map((f) => ({ field: f, value: state[f] })),
    notIdentifying: NON_READING_AFFECTING.slice(),
    byLayer,
    provenance: composed.provenance,
    availability: state.availability,
  };
}

export function readingTiers(reflection) {
  if (!reflection || !reflection.state || !reflection.composed) return null;
  const { state, composed } = reflection;
  return {
    tier1: tierOne(state, composed),
    tier2: tierTwo(state, composed),
    tier3: tierThree(state, composed),
  };
}
