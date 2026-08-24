/*
 * Stage 3: the sole product-facing entry point into the heritage connector
 * graph. UI and Reflection Engine code must call this — never
 * `resolveHeritageConnections` directly — so gate precedence and the
 * ACTIVE / SOURCE-PANEL / DISAGREEMENT / EDITORIAL / ABSTENTION split are
 * enforced in exactly one place, rather than re-decided ad hoc at every call
 * site.
 *
 * ── WHY GATES ARE CHECKED HERE, NOT INSIDE resolveHeritageConnections ──────
 * Stage 2's resolver deliberately never reads `readingState.availability`
 * (see resolver.js's file header) because heritage material is independent
 * of whether today's Qi Se measurement succeeded
 * (READING_EXPERIENCE_CONTRACT.md §13 — a rotated heritage passage is not a
 * claim about today's capture). "Gate suppression" here is a different,
 * upstream question — did the capture even produce a usable frame, and did
 * any safety gate fire — and it belongs at the boundary, before the resolver
 * is invoked at all, per `docs/PRODUCT_DESIGN_V2.md`'s documented
 * `captureQualityGate -> safetyGate -> measurementLayer -> heritageLayer`
 * precedence: any gate firing suppresses everything downstream, including
 * heritage content. Folding this into the resolver would reopen the frozen
 * Stage 2 contract; checking it here, before the resolver is ever called,
 * does not.
 *
 * ── WHY THE INPUT IS THIS NARROW ────────────────────────────────────────────
 * `heritageConstruct`/`sourceLineage` are the resolver's own declared
 * dependency surface (`RESOLVER_DEPENDS_ON` in resolver.js). This module
 * reconstructs a fresh, minimal `readingState` from exactly those two
 * fields — it never forwards a caller's full interpreted state, compass,
 * history or self-report, so modern Qi Se measurement cannot leak into the
 * historical graph as a generic predicate bag. There is deliberately no
 * parameter here that would accept one.
 *
 * ── WHAT THIS MODULE DOES NOT DO ────────────────────────────────────────────
 * It produces no prose (Stage 2's constraint, inherited unchanged) and no
 * second selection/rotation mechanism — the "one bounded Tier 2 pick" is
 * always `renderPlan.relationshipOrder[0]`, the resolver's own deterministic
 * rotation, never a value computed here. It does not persist anything; every
 * field is recomputed from the injected registries and the caller's
 * explicit inputs on every call.
 */

import { resolveHeritageConnections, DEPTH_MODES } from "./resolver.js";

export const SUPPRESSION_REASONS = Object.freeze([
  "CAPTURE_QUALITY_GATE_FAILED",
  "SAFETY_GATE_FAILED",
]);

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
    abstained: true,
    abstentionReasonCode: reason,
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
 * E — abstentions/suppressions. `gateReasons` is preserved verbatim from the
 * resolver so distinct reasons (e.g. PARTICIPANT_ABSENT vs
 * PARTICIPANT_UNKNOWN) remain distinguishable — collapsing them here would
 * repeat item 23/38's mistake of merging two different "why not" reasons
 * into one.
 */
function toAbstention(entry) {
  return Object.freeze({
    connectorId: entry.connectorId,
    disposition: entry.disposition,
    relationshipAvailability: entry.relationshipAvailability,
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
 * The pure Stage 3 boundary. Every registry `resolveHeritageConnections`
 * needs is injected here too (see that function's own header) — this module
 * adds gate precedence and output typing on top, nothing else.
 *
 * `captureQualityPassed`/`safetyPassed` default to `true` so existing tests
 * and callers that predate any real gate wiring keep working unchanged; a
 * caller that actually has gate state must pass it explicitly. Either gate
 * being anything other than exactly `true` suppresses the ENTIRE
 * resolution — the resolver is never invoked, so no registry content of any
 * kind (not even an editorial juxtaposition) can leak through a fired gate.
 */
export function composeHeritageForReading({
  captureQualityPassed = true,
  safetyPassed = true,
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
  if (captureQualityPassed !== true) {
    return suppressedResult("CAPTURE_QUALITY_GATE_FAILED", depthMode, occurrence);
  }
  if (safetyPassed !== true) {
    return suppressedResult("SAFETY_GATE_FAILED", depthMode, occurrence);
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

let cachedDefaultRegistries = null;
async function loadDefaultRegistries() {
  if (!cachedDefaultRegistries) {
    const [registryMod, negativeMod, policyMod, conceptMod, provenanceMod] = await Promise.all([
      import("./registry.js"),
      import("./negative-relationships-registry.js"),
      import("./composition-policies-registry.js"),
      import("./concepts.js"),
      import("../reading/provenance.js"),
    ]);
    cachedDefaultRegistries = {
      heritageRegistry: registryMod.HERITAGE_REGISTRY,
      connectorRegistry: registryMod.HERITAGE_CONNECTOR_REGISTRY,
      disagreementRegistry: registryMod.HERITAGE_DISAGREEMENT_REGISTRY,
      negativeRelationshipRegistry: negativeMod.HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
      compositionPolicies: policyMod.HERITAGE_COMPOSITION_POLICIES,
      conceptRegistry: conceptMod.HERITAGE_CONCEPT_REGISTRY,
      sourceRegistry: provenanceMod.SOURCE_REGISTRY,
    };
  }
  return cachedDefaultRegistries;
}

/**
 * Thin production wrapper: real registries, identical gate precedence and
 * output shape. Mirrors `resolveHeritageConnectionsWithDefaults`
 * (resolver.js) — the pure function above never imports these itself, same
 * reasoning as that file's header. Gates are still checked FIRST, before the
 * registries are even loaded, so a fired gate costs nothing and leaks
 * nothing.
 */
export async function composeHeritageForReadingWithDefaults({
  captureQualityPassed = true,
  safetyPassed = true,
  heritageConstruct,
  sourceLineage,
  depthMode = "STANDARD",
  occurrence = 0,
  conditionContext = null,
  runtimeBindingContext = null,
  rotationState = null,
} = {}) {
  if (captureQualityPassed !== true) {
    return suppressedResult("CAPTURE_QUALITY_GATE_FAILED", depthMode, occurrence);
  }
  if (safetyPassed !== true) {
    return suppressedResult("SAFETY_GATE_FAILED", depthMode, occurrence);
  }

  const registries = await loadDefaultRegistries();
  const result = resolveHeritageConnections({
    ...registries,
    readingState: { heritageConstruct, sourceLineage },
    conditionContext,
    runtimeBindingContext,
    rotationState,
    depthMode,
    occurrence,
  });

  return mapResolverResult(result, depthMode, occurrence);
}
