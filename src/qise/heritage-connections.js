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
 * `tests/qise/heritage-connections.test.js` asserts reading-tiers.js's source
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
 *
 * ── WHY TIER 2 AND TIER 3 SHARE ONE `composeHeritageForReading` CALL, NOT TWO
 *    AT DIFFERENT `depthMode`s ──────────────────────────────────────────────
 * A fresh review found that Tier 2 requested `depthMode: "STANDARD"` and
 * Tier 3 requested `depthMode: "SOURCE_DEEP"` as two SEPARATE resolver calls.
 * Stage 2's own deterministic rotation seed
 * (`resolver.js`'s `rotationSeed = "...|depthMode=${depthMode}"`) includes
 * `depthMode` by design — a real, load-bearing part of Stage 2's frozen
 * contract, not something this file may "fix" by changing resolver.js. But
 * it also means two calls that differ only in `depthMode` can rotate their
 * `renderPlan.relationshipOrder` DIFFERENTLY whenever a construct has two or
 * more ACTIVE connectors and `occurrence > 0` — so Tier 2's top pick and
 * Tier 3's presentation order could, in principle, name a DIFFERENT
 * connector as "first" for the exact same reading. That violates the locked
 * rule of ONE deterministic connector-selection lifecycle per reading: Tier
 * 3 must EXPAND on what Tier 2 showed, never reroll it.
 *
 * `composeHeritageOnceForReading()` is the fix: exactly one
 * `composeHeritageForReading` call per reading, always at `"SOURCE_DEEP"`
 * (the deepest depth, a strict superset of what any shallower depth would
 * return — `active` and `abstentions` are already depth-INDEPENDENT in
 * Stage 2's own resolver; only `sourcePanelOnly`, the editorial candidate
 * pool and `relationshipOrder`'s rotation/cap vary by depth). Both
 * `tierTwoHeritageConnections` and `tierThreeHeritageConnections` — and
 * `readingTiersWithHeritage`, which computes it exactly once and hands the
 * SAME result object to both derivations — read from this one call, so
 * their `renderPlan` (and therefore their top pick) is IDENTICAL by
 * construction, not by coincidence of matching inputs.
 *
 * Reusing a SOURCE_DEEP result for Tier 2 does not, by itself, leak
 * SOURCE_PANEL_CEILING material into Tier 2: `deriveTier2FromComposition`
 * only ever reads `result.active` and `result.renderPlan.relationshipOrder`
 * (built from `active` alone), never `result.sourcePanelOnly`, and never
 * exposes `result.editorialJuxtapositions` at all. The one field that DOES
 * become depth-sensitive when reused this way is `result.disagreements`:
 * Stage 2's `visibleConnectorIds` (resolver.js item 9) includes
 * `sourcePanelOnly` connector ids only at `SOURCE_DEEP`, so a
 * CONNECTOR-targeted disagreement about a connector that is ONLY in
 * `sourcePanelOnly` would, read naively, appear in a SOURCE_DEEP-computed
 * result even though Tier 2 never shows that connector.
 * `tier2VisibleDisagreements()` below reconstructs exactly what
 * `visibleConnectorIds` would have been at Tier 2's own (shallower)
 * visibility — `active ∪ abstentions`, i.e. everything except
 * `sourcePanelOnly` — without a second resolver call, so this protection
 * survives the merge to one call.
 */

import { readingTiers } from "./reading-tiers.js";
import { composeHeritageForReading } from "../heritage/composition.js";
import { ROTATION_DISCLOSURE } from "./reflection-corpus.js";

/*
 * ── CAPTURE-QUALITY AUTHORIZATION: DERIVED FROM captureTier, NEVER FROM
 *    OBJECT EXISTENCE ──────────────────────────────────────────────────────
 * A stored `reading` object existing is not proof its OWN capture-quality
 * gates passed — it proves nothing about its own history. `captureTier` is
 * the field that IS that proof: `src/qise/gates.js`'s `evaluateGates()` is
 * the only thing that ever produces it, and it is only ever "clean" or
 * "assisted" when `evaluateGates().pass` was true; "waiting" is an explicit
 * record that the gates did NOT pass. `src/qise/store.js`'s `toRecord()`
 * already persists this field on every stored reading (it is a plain
 * category string — not biometric, not raw, not a gate report), so no new
 * persisted field is needed; this is a pure reinterpretation of a field the
 * capture path already writes and `readingConfidence()` (baseline.js)
 * already trusts for exactly this purpose.
 */
const CAPTURE_TIER_AUTHORIZED = Object.freeze(["clean", "assisted"]);

/**
 * The authoritative capture-quality gate boolean for Stage 3, derived from
 * an already-persisted `reading` record. Returns `true` only for an
 * explicit "clean"/"assisted" `captureTier`; `false` for an explicit
 * "waiting" (the gates are recorded as NOT having passed); `undefined` for
 * anything else, including a missing field, a malformed value, or `reading`
 * itself being absent. `false` and `undefined` are NOT the same thing: fed
 * into `src/heritage/composition.js`'s `gateStatus()`, `false` reads as
 * FAILED (the gates ran and did not pass) while `undefined` reads as
 * UNKNOWN (no gate evidence exists at all) — two different reasons
 * (`CAPTURE_QUALITY_GATE_FAILED` vs `CAPTURE_QUALITY_GATE_UNKNOWN`). Both
 * suppress output, but never for the same reason. Changing Qi Se MEASUREMENT
 * values (compass, metrics, confidence) has no effect here at all — only
 * `captureTier` is read.
 */
export function captureAuthorizationFromReading(reading) {
  const tier = reading && reading.captureTier;
  if (CAPTURE_TIER_AUTHORIZED.includes(tier)) return true;
  if (tier === "waiting") return false;
  return undefined;
}

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
 * THE single Stage 3 composition call for a reading. Always `SOURCE_DEEP` —
 * see the file header's "WHY TIER 2 AND TIER 3 SHARE ONE
 * `composeHeritageForReading` CALL" section for why. Returns `null` only
 * when there is no reflection state to compose from at all.
 */
export function composeHeritageOnceForReading(reflection, compose = {}) {
  if (!reflection || !reflection.state) return null;
  return composeHeritageForReading({
    ...compose,
    heritageConstruct: reflection.state.heritageConstruct,
    sourceLineage: reflection.state.sourceLineage,
    occurrence: occurrenceOf(reflection),
    depthMode: "SOURCE_DEEP",
  });
}

/**
 * Reconstructs, WITHOUT a second resolver call, what Stage 2's own
 * `visibleConnectorIds` would have been at Tier 2's shallower visibility —
 * `active ∪ abstentions` (resolver.js's `unavailable`), i.e. everything
 * except `sourcePanelOnly`. A CONNECTOR-targeted disagreement whose
 * `target.targetRef` names a connector that is ONLY in `sourcePanelOnly` is
 * dropped; a CONSTRUCT-targeted disagreement, or one targeting a connector
 * that is `active` or merely `unavailable` (blocked, but not
 * SOURCE_PANEL_CEILING-only), survives unchanged. Mirrors resolver.js item 9
 * exactly, at the one tier that must not see SOURCE_DEEP-only material.
 */
export function tier2VisibleDisagreements(result) {
  const visible = new Set([...(result.active || []), ...(result.abstentions || [])]
    .map((entry) => entry.connectorId));
  return (result.disagreements || []).filter((d) => (
    d.target?.targetType !== "CONNECTOR" || visible.has(d.target.targetRef)
  ));
}

/**
 * The pure Tier 2 selection: at most ONE bounded heritage composition, from
 * the resolver's own deterministic top pick (`renderPlan.relationshipOrder[0]`).
 * Never a second, independent selection mechanism (Stage 3 requirement 4).
 *
 * SOURCE_PANEL_CEILING material cannot leak in here even though `result` may
 * have been computed at `SOURCE_DEEP`: only `result.active` and
 * `result.renderPlan.relationshipOrder` (itself built from `active` alone)
 * are ever read for the connector, `result.disagreements` is filtered through
 * `tier2VisibleDisagreements()`, and `result.editorialJuxtapositions` /
 * `result.sourcePanelOnly` are never read or returned at all.
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
 * logic itself is testable against a hand-built composition result. As of
 * D2-3 (DR-2026-08-31-D2-CONNECTOR-PREDICATE) the real corpus DOES contain
 * two ACTIVE connectors for one construct (threeSections: the Taiqing 相稱
 * and Yuguan 平等 records) — see
 * tests/heritage/three-sections-predicate-acceptance.test.js's Tier 2
 * rotation test for that exercised against the real registry. The synthetic
 * fixture below is kept regardless: it isolates the selection algorithm from
 * corpus content, so a future change to that one construct's evidence cannot
 * silently stop covering rotation/sourcePanelOnly isolation for every other
 * construct.
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
    disagreements: tier2VisibleDisagreements(result),
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
  const result = composeHeritageOnceForReading(reflection, compose);
  if (!result) return NO_CONNECTOR_TIER2;
  return deriveTier2FromComposition(result);
}

/**
 * Tier 3 — everything: sources, disagreement, availability,
 * SOURCE_PANEL_CEILING material, editorial juxtapositions. Always the SAME
 * `SOURCE_DEEP` composition Tier 2 derives its bounded view from (see the
 * file header) — this function must never be given a DIFFERENT depthMode
 * than `tierTwoHeritageConnections`/`composeHeritageOnceForReading` use, or
 * the single-selection-lifecycle guarantee breaks again. Every connector
 * named inside an editorial juxtaposition here IS present in `active`/
 * `sourcePanelOnly`, so separate attribution is always renderable.
 */
export function tierThreeHeritageConnections(reflection, compose = {}) {
  return composeHeritageOnceForReading(reflection, compose)
    ?? composeHeritageForReading({ ...compose, depthMode: "SOURCE_DEEP" });
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
 *
 * Computes the Stage 3 composition EXACTLY ONCE (`composeHeritageOnceForReading`)
 * and hands the SAME result to both `deriveTier2FromComposition` (Tier 2's
 * bounded view) and Tier 3 (the full result) — never two separate resolver
 * calls at different depths for one reading.
 */
export function readingTiersWithHeritage(reflection, compose = {}) {
  const base = readingTiers(reflection);
  if (!base) return null;
  const composition = composeHeritageOnceForReading(reflection, compose);
  return {
    tier1: base.tier1,
    tier2: { ...base.tier2, connectors: composition ? deriveTier2FromComposition(composition) : NO_CONNECTOR_TIER2 },
    tier3: { ...base.tier3, connectors: composition ?? composeHeritageForReading({ ...compose, depthMode: "SOURCE_DEEP" }) },
  };
}
