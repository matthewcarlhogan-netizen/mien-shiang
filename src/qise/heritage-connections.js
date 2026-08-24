/*
 * Stage 3 — the actual integration point between the heritage connector
 * graph and the Qi Se reading path.
 *
 * ── WHY THIS IS A SEPARATE FILE FROM reading-tiers.js ───────────────────────
 * `reading-tiers.js` is Tier 1's module: `readingTiers()`, `tierOne()`,
 * `tierTwo()` and `tierThree()` are pinned by tests/qise/reading-tiers.test.js
 * and are the fastest, most-shown surface in the product (Contract §15 —
 * "Tier 1 — Today ... Fast."). An earlier draft of Stage 3 added a top-level
 * import of src/heritage/composition.js directly into reading-tiers.js. That
 * meant ANY consumer of `tierOne` alone — Tier 1's whole reason to exist —
 * transitively loaded composition.js, resolver.js and the connector
 * registries at module-instantiation time, paying their load cost and their
 * failure modes even when nothing about connectors was ever asked for. That
 * is exactly the class of defect item 18a/44 in CLAUDE.md describes: a
 * dependency that "looks reachable" only because nothing traced the actual
 * import graph. Keeping the connector integration in its own file is what
 * makes `import { tierOne } from "./reading-tiers.js"` provably free of it —
 * `tests/heritage/composition.test.js` asserts reading-tiers.js's source
 * contains no reference to composition.js at all, not merely that one
 * function's body doesn't call it.
 *
 * ── WHY OCCURRENCE COMES FROM THE REFLECTION, NEVER FROM `compose` ──────────
 * reflection.js already has a deterministic occurrence/rotation mechanism:
 * `occurrenceIndexFor()` (reading-pipeline.js) counts how many times the
 * exact interpreted state has occurred before, and that number seeds BOTH
 * `composeReading()`'s own prose variation AND — here — the connector
 * resolver's rotation. Accepting a second, independently-supplied occurrence
 * would let the connector graph rotate on its own schedule, unrelated to the
 * schedule the rest of the reading already rotates on, which is the "two
 * independently driven rotation lifecycles" this module exists to prevent.
 * So `reflection.occurrence` is read directly and any `occurrence` field on
 * `compose` is ignored — there is exactly one occurrence per reading.
 */

import { readingTiers } from "./reading-tiers.js";
import { composeHeritageForReading } from "../heritage/composition.js";
import { ROTATION_DISCLOSURE } from "./reflection-corpus.js";

const NO_CONNECTOR_TIER2 = Object.freeze({
  available: false,
  reason: "NO_READING",
  connector: null,
  disagreements: Object.freeze([]),
  rotationDisclosure: null,
  occurrence: null,
});

function occurrenceOf(reflection) {
  return Number.isFinite(reflection?.occurrence) ? reflection.occurrence : 0;
}

/**
 * The pure Tier 2 selection: at most ONE bounded heritage composition, from
 * the resolver's own deterministic top pick (`renderPlan.relationshipOrder[0]`).
 * Never a second, independent selection mechanism (Stage 3 requirement 4).
 *
 * Editorial juxtapositions are deliberately NOT surfaced here: they require
 * `requiresSeparateAttribution` over 2-3 connectors, and Tier 2 only ever
 * carries full detail for the one connector it selected — attaching an
 * editorial suggestion naming connectors Tier 2 has no data for would make
 * that attribution requirement unmeetable. Editorial juxtapositions belong to
 * Tier 3, where every referenced connector already has full detail available
 * (see `tierThreeHeritageConnections` below).
 *
 * Exported separately from `tierTwoHeritageConnections` so the selection
 * logic itself is testable against a hand-built composition result — the
 * real corpus does not yet contain two ACTIVE connectors for the same
 * construct, so this is the only way to exercise the rotation/selection path
 * today without waiting for the corpus to grow.
 */
export function deriveTier2FromComposition(result) {
  if (result.suppressed || result.abstained) {
    return {
      available: false,
      reason: result.suppressionReason || result.abstentionReasonCode,
      connector: null,
      disagreements: Object.freeze([]),
      rotationDisclosure: null,
      occurrence: result.occurrence,
    };
  }

  const topId = result.renderPlan?.relationshipOrder?.[0] ?? null;
  const connector = topId
    ? result.active.find((entry) => entry.connectorId === topId) || null
    : null;

  return {
    available: Boolean(connector),
    reason: connector ? null : "NO_ACTIVE_CONNECTOR",
    connector,
    disagreements: result.disagreements,
    // Contract §13: a rotated selection must disclose that it rotated,
    // carried outside the prose so a surface cannot drop it while keeping
    // the connector. Reused verbatim from reflection.js's own rotation
    // disclosure rather than a second, independently authored sentence for
    // the same mechanism.
    rotationDisclosure: connector ? ROTATION_DISCLOSURE : null,
    // Surfaced so callers/tests can confirm this came from
    // `reflection.occurrence` and nowhere else — see the file header on
    // shared rotation lifecycles.
    occurrence: result.occurrence,
  };
}

export function tierTwoHeritageConnections(reflection, compose = {}) {
  if (!reflection || !reflection.state) return NO_CONNECTOR_TIER2;

  const result = composeHeritageForReading({
    ...compose,
    heritageConstruct: reflection.state.heritageConstruct,
    sourceLineage: reflection.state.sourceLineage,
    occurrence: occurrenceOf(reflection),
    depthMode: "STANDARD",
  });

  return deriveTier2FromComposition(result);
}

/**
 * Tier 3 — everything: sources, disagreement, availability,
 * SOURCE_PANEL_CEILING material, editorial juxtapositions. SOURCE_DEEP is the
 * only depth at which the resolver ever populates `sourcePanelOnly`
 * (resolver.js item 9) — this function must never be reused to feed Tier 2,
 * or ceilinged material leaks into the daily surface. Every connector named
 * inside an editorial juxtaposition here IS present in `active`/
 * `sourcePanelOnly`, so separate attribution is always renderable.
 */
export function tierThreeHeritageConnections(reflection, compose = {}) {
  if (!reflection || !reflection.state) {
    return composeHeritageForReading({ ...compose, depthMode: "SOURCE_DEEP" });
  }
  return composeHeritageForReading({
    ...compose,
    heritageConstruct: reflection.state.heritageConstruct,
    sourceLineage: reflection.state.sourceLineage,
    occurrence: occurrenceOf(reflection),
    depthMode: "SOURCE_DEEP",
  });
}

/**
 * THE Stage 3 integration point into the actual reading path. Wraps the
 * frozen `readingTiers()` unchanged and adds heritage-connector material
 * alongside `tier2`/`tier3` — `tier1` is copied through verbatim and never
 * gains a connector dependency. Product code (currently
 * `src/ui/qise/app.js`) should call THIS instead of calling `readingTiers()`
 * and the connector boundary separately; that is what "Tier 2/Tier 3 can
 * consume the model without ad-hoc UI resolver calls" means in practice —
 * one function, one place the two are stitched together.
 */
export function readingTiersWithHeritage(reflection, compose = {}) {
  const base = readingTiers(reflection);
  if (!base) return null;
  return {
    tier1: base.tier1,
    tier2: { ...base.tier2, connectors: tierTwoHeritageConnections(reflection, compose) },
    tier3: { ...base.tier3, connectors: tierThreeHeritageConnections(reflection, compose) },
  };
}
