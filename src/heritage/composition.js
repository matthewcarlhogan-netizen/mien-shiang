/*
 * Stage 3: the sole product-facing entry point into the heritage connector
 * graph. UI and Reflection Engine code must call `composeHeritageForReading`
 * — never `resolveHeritageConnections` directly, and never
 * `composeHeritageConnectionsWithRegistries` (the test/internal seam below)
 * — so gate precedence, canonical-registry ownership, and the
 * ACTIVE / SOURCE-PANEL / DISAGREEMENT / EDITORIAL / ABSTENTION split are
 * enforced in exactly one place.
 *
 * ── WHY GATES FAIL CLOSED ON "UNKNOWN", NOT JUST ON "FALSE" ─────────────────
 * A caller that has never been wired to real gate state and one that has
 * been wired and told "the gate failed" must not be treated the same as a
 * caller that has been wired and told "the gate passed". `captureQualityPassed`/
 * `safetyPassed` are read through `gateStatus()`, which recognises exactly the
 * boolean `true` as PASSED — `false` is FAILED, and anything else (`undefined`,
 * `null`, a string, an accidental `0`) is UNKNOWN. Both FAILED and UNKNOWN
 * suppress; only literal `true` proceeds. This is what stops the historically
 * easy mistake of a default parameter silently authorising output the moment
 * nobody has gotten around to wiring the real gate yet (see
 * docs/PRODUCT_DESIGN_V2.md's `captureQualityGate -> safetyGate ->
 * measurementLayer -> heritageLayer` precedence: "any gate firing suppresses
 * everything downstream" — an unwired gate has not been proven not to have
 * fired).
 *
 * ── WHY GATE SUPPRESSION IS NOT A STAGE 2 ABSTENTION ────────────────────────
 * `suppressed`/`suppressionReason` and `abstained`/`abstentionReasonCode` are
 * two different axes and must never be conflated. `suppressed` means this
 * module refused to call the resolver at all — an upstream fact, decided here,
 * before Stage 2 is ever reached. `abstained` is the resolver's OWN verdict
 * (e.g. `UNKNOWN_HERITAGE_CONSTRUCT`, `INVALID_RUNTIME_BINDING_CONTEXT`) and
 * is only ever `true` when the resolver actually ran and chose to abstain. A
 * suppressed result therefore always carries `abstained: false,
 * abstentionReasonCode: null` — there is no Stage 2 verdict to report, because
 * Stage 2 was never asked.
 *
 * ── WHY CANONICAL REGISTRIES ARE BOUND HERE, NOT INJECTED ───────────────────
 * `composeHeritageForReading` accepts only the finite runtime contract listed
 * in `RUNTIME_CONTRACT_KEYS` — no registry of any kind. `CANONICAL_REGISTRIES`
 * is a plain static import bound once, at module load, and is what every
 * production call resolves against; a caller cannot substitute a different
 * registry, accidentally or otherwise; passing anything outside the allowed
 * key set throws rather than being silently ignored. Registry injection
 * survives only as `composeHeritageConnectionsWithRegistries`, an explicit,
 * separately named seam for tests (and this module's own internals) that
 * need a synthetic universe — product code must not call it.
 *
 * ── WHY THE FINITE CONTRACT IS THIS NARROW ──────────────────────────────────
 * `heritageConstruct`/`sourceLineage` are the resolver's own declared
 * dependency surface (`RESOLVER_DEPENDS_ON` in resolver.js). This module
 * reconstructs a fresh `readingState` from exactly those two fields — it
 * never forwards a caller's full interpreted state, compass, history or
 * self-report, so modern Qi Se measurement cannot leak into the historical
 * graph as a generic predicate bag.
 *
 * ── WHAT THIS MODULE DOES NOT DO ────────────────────────────────────────────
 * It produces no prose (Stage 2's constraint, inherited unchanged) and no
 * second selection/rotation mechanism — see src/qise/heritage-connections.js,
 * which is the ONLY caller of this module from product code, for how
 * `occurrence` is shared with reflection.js's own rotation rather than driven
 * independently. It does not persist anything; every field is recomputed on
 * every call.
 */

import { resolveHeritageConnections, DEPTH_MODES } from "./resolver.js";
import {
  HERITAGE_REGISTRY,
  HERITAGE_CONNECTOR_REGISTRY,
  HERITAGE_DISAGREEMENT_REGISTRY,
} from "./registry.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "./negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "./composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "./concepts.js";
import { SOURCE_REGISTRY } from "../reading/provenance.js";

export const SUPPRESSION_REASONS = Object.freeze([
  "CAPTURE_QUALITY_GATE_FAILED",
  "CAPTURE_QUALITY_GATE_UNKNOWN",
  "SAFETY_GATE_FAILED",
  "SAFETY_GATE_UNKNOWN",
]);

/*
 * Bound once, at module load, from the real Stage 1 registries. This is the
 * ONLY registry set `composeHeritageForReading` will ever resolve against —
 * see the file header for why that matters.
 */
const CANONICAL_REGISTRIES = Object.freeze({
  heritageRegistry: HERITAGE_REGISTRY,
  conceptRegistry: HERITAGE_CONCEPT_REGISTRY,
  connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
  disagreementRegistry: HERITAGE_DISAGREEMENT_REGISTRY,
  negativeRelationshipRegistry: HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
  compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
  sourceRegistry: SOURCE_REGISTRY,
});

/** Exactly `true` passes; `false` fails; anything else is unknown. */
function gateStatus(value) {
  if (value === true) return "PASSED";
  if (value === false) return "FAILED";
  return "UNKNOWN";
}

function resolveDepthMode(depthMode) {
  return DEPTH_MODES.includes(depthMode) ? depthMode : "STANDARD";
}

function resolveOccurrence(occurrence) {
  return Number.isFinite(occurrence) ? Math.max(0, occurrence | 0) : 0;
}

function suppressedResult(reason, depthMode, occurrence) {
  return Object.freeze({
    suppressed: true,
    suppressionReason: reason,
    // A suppressed result never carries a Stage 2 verdict — see file header.
    abstained: false,
    abstentionReasonCode: null,
    primaryConstruct: null,
    primaryLineage: null,
    // Category A — active historical relationships.
    active: Object.freeze([]),
    // Category B — source-panel-only relationships.
    sourcePanelOnly: Object.freeze([]),
    // Category C — disagreements.
    disagreements: Object.freeze([]),
    // Category D — editorial juxtapositions.
    editorialJuxtapositions: Object.freeze([]),
    // Category E — abstentions/suppressions.
    abstentions: Object.freeze([]),
    renderPlan: null,
    depthMode: resolveDepthMode(depthMode),
    occurrence: resolveOccurrence(occurrence),
  });
}

/*
 * D — editorial juxtapositions are never historical claims.
 * `historicalRelationshipAsserted` and the disclosure id are copied verbatim
 * from the resolver's output, which itself copies them verbatim from the
 * `HERITAGE_COMPOSITION_POLICIES` record — never computed or overridden
 * here, so this module cannot accidentally launder an editorial pairing into
 * something that reads as attested.
 */
function toEditorial(j) {
  return Object.freeze({
    policyId: j.policyId,
    items: j.items,
    historicalRelationshipAsserted: j.historicalRelationshipAsserted,
    requiresSeparateAttribution: j.requiresSeparateAttribution,
    disclosure: j.disclosureId,
  });
}

/*
 * E — abstentions/suppressions. `gateReasons` and `prohibitedForUserInference`
 * are preserved verbatim from the resolver: the frozen Stage 2 contract
 * requires `prohibitedForUserInference` to stay true on every surfaced
 * connector entry, including the ones parked here as unavailable, and
 * distinct gate reasons (e.g. PARTICIPANT_ABSENT vs PARTICIPANT_UNKNOWN) must
 * stay distinguishable rather than collapsed.
 */
function toAbstention(entry) {
  return Object.freeze({
    connectorId: entry.connectorId,
    disposition: entry.disposition,
    relationshipAvailability: entry.relationshipAvailability,
    prohibitedForUserInference: entry.prohibitedForUserInference,
    gateReasons: entry.gateReasons,
  });
}

function mapResolverResult(result, depthMode, occurrence) {
  return Object.freeze({
    suppressed: false,
    suppressionReason: null,
    abstained: result.abstained,
    abstentionReasonCode: result.abstentionReasonCode,
    primaryConstruct: result.primaryConstruct,
    primaryLineage: result.primaryLineage,
    active: result.activeConnectors,
    sourcePanelOnly: result.sourcePanels,
    disagreements: result.disagreementPanels,
    editorialJuxtapositions: Object.freeze(
      result.editorialJuxtapositions.map(toEditorial),
    ),
    abstentions: Object.freeze(
      result.unavailableRelations.map(toAbstention),
    ),
    renderPlan: result.renderPlan,
    depthMode: resolveDepthMode(depthMode),
    occurrence: resolveOccurrence(occurrence),
  });
}

/**
 * The shared implementation: gate precedence, then the resolver, then output
 * typing. Neither exported function below adds behaviour beyond this — they
 * differ only in where their registries come from.
 */
function composeHeritageConnectionsInternal({
  captureQualityPassed,
  safetyPassed,
  heritageConstruct,
  sourceLineage,
  depthMode = "STANDARD",
  occurrence = 0,
  conditionContext = null,
  runtimeBindingContext = null,
  rotationState = null,
  heritageRegistry,
  conceptRegistry,
  connectorRegistry,
  disagreementRegistry,
  negativeRelationshipRegistry,
  compositionPolicies,
  sourceRegistry,
} = {}) {
  const captureStatus = gateStatus(captureQualityPassed);
  if (captureStatus !== "PASSED") {
    return suppressedResult(
      captureStatus === "FAILED" ? "CAPTURE_QUALITY_GATE_FAILED" : "CAPTURE_QUALITY_GATE_UNKNOWN",
      depthMode, occurrence,
    );
  }
  const safetyStatus = gateStatus(safetyPassed);
  if (safetyStatus !== "PASSED") {
    return suppressedResult(
      safetyStatus === "FAILED" ? "SAFETY_GATE_FAILED" : "SAFETY_GATE_UNKNOWN",
      depthMode, occurrence,
    );
  }

  const result = resolveHeritageConnections({
    heritageRegistry,
    conceptRegistry,
    connectorRegistry,
    disagreementRegistry,
    negativeRelationshipRegistry,
    compositionPolicies,
    sourceRegistry,
    // The narrow reconstruction described in the file header: exactly the
    // resolver's own declared RESOLVER_DEPENDS_ON fields, nothing else.
    readingState: { heritageConstruct, sourceLineage },
    conditionContext,
    runtimeBindingContext,
    rotationState,
    depthMode,
    occurrence,
  });

  return mapResolverResult(result, depthMode, occurrence);
}

/**
 * TEST / INTERNAL DEPENDENCY-INJECTION SEAM.
 *
 * Product code must call `composeHeritageForReading` instead. This function
 * exists so tests (and nothing else) can exercise the composition boundary
 * against a synthetic or fixture registry set without touching the real
 * heritage graph. Gate precedence is identical — this is not a way around
 * fail-closed gating, only a way around which registries are consulted.
 */
export function composeHeritageConnectionsWithRegistries(input = {}) {
  return composeHeritageConnectionsInternal(input);
}

const RUNTIME_CONTRACT_KEYS = Object.freeze([
  "captureQualityPassed",
  "safetyPassed",
  "heritageConstruct",
  "sourceLineage",
  "depthMode",
  "occurrence",
  "conditionContext",
  "runtimeBindingContext",
  "rotationState",
]);

/**
 * THE product-facing Stage 3 entry point. Accepts only the finite runtime
 * contract in `RUNTIME_CONTRACT_KEYS` — no registry of any kind. Canonical
 * registries are bound internally (`CANONICAL_REGISTRIES`, above) and cannot
 * be substituted: passing any other key throws immediately, rather than
 * being silently accepted and ignored.
 */
export function composeHeritageForReading(runtimeContract = {}) {
  const unexpected = Object.keys(runtimeContract).filter(
    (key) => !RUNTIME_CONTRACT_KEYS.includes(key),
  );
  if (unexpected.length > 0) {
    throw new TypeError(
      "composeHeritageForReading accepts only the finite runtime contract "
      + `(${RUNTIME_CONTRACT_KEYS.join(", ")}); unexpected field(s): ${unexpected.join(", ")}. `
      + "Canonical registries are bound internally and cannot be injected here — "
      + "use composeHeritageConnectionsWithRegistries in tests instead.",
    );
  }
  return composeHeritageConnectionsInternal({ ...runtimeContract, ...CANONICAL_REGISTRIES });
}
