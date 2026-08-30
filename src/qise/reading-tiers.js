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
 * Tier 2 — Reading.
 *
 * The heritage passage is deliberately kept separate from the personal
 * context. Tier 1 is the quick report; Tier 2 is where that report is placed
 * beside the attributed tradition. Reusing the already-computed production
 * components here makes the richer surface genuinely responsive to the
 * person's history and confidence without inventing a second interpretation
 * or letting heritage prose masquerade as measurement.
 */
export function tierTwo(state, composed) {
  const material = heritageMaterialFor(state);
  return {
    personalContext: Object.freeze({
      availability: textsFor(composed, ["availability"])[0] || "",
      observation: textsFor(composed, ["observation"])[0] || "",
      magnitude: textsFor(composed, ["magnitude"])[0] || "",
      history: textsFor(composed, ["history"])[0] || "",
      confidence: textsFor(composed, ["confidence"])[0] || "",
    }),
    passage: composed.layers.heritage.join(" "),
    attribution: material.attribution,
    sourceStatus: material.abstained
      ? "WITHHELD_PENDING_SOURCE_REVIEW"
      : material.runtimeStatus === "RUNTIME_PROSE" ? "RUNTIME_PROSE" : "BETA_PREVIEW",
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
