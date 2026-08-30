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
 *
 * ── WHY `rotationState` IS NOT IN THE PRODUCT-FACING CONTRACT ───────────────
 * Stage 2's resolver accepts an optional `rotationState.recentConnectorIds`
 * to deprioritise recently-shown connectors ahead of its own deterministic
 * rotation. Exposing that on the product-facing contract would hand a caller
 * a SECOND, independently-suppliable selection input alongside `occurrence`
 * — exactly the "two independently driven rotation lifecycles" Stage 3 must
 * not create. There is also no canonical source for "recently shown
 * connector ids" today (Stage 3 deliberately persists nothing — see
 * docs/HERITAGE_CONNECTOR_STAGE_STATUS.md's "keep reading-state small"), so
 * there is nothing legitimate to derive it from yet. `occurrence` alone
 * already provides full, deterministic variation via
 * `rotateDeterministically`'s coprime-stride walk. `rotationState` remains
 * available ONLY on `composeHeritageConnectionsWithRegistries`, the
 * test/internal seam, for exercising the resolver's own already-tested
 * behaviour directly.
 *
 * ── THE LINEAGE ADAPTER ──────────────────────────────────────────────────────
 * `reading-state.js`'s `sourceLineage` is a two-value ABSTRACT rotation label
 * (`"primary"` / `"variant"`), general across all six constructs. The
 * canonical heritage registry's OWN lineages are construct-specific and
 * often richer (e.g. fiveMountains also has `"taiqing-siku"`, `"sxqb-chin"`,
 * `"shenyi-lower-face-zone"`). `resolveHeritageLineage()` is the explicit,
 * finite gate between the two: it accepts either the abstract label or an
 * explicit canonical lineage id, and returns that same string ONLY if it is
 * a lineage this SPECIFIC construct actually declares — never a different,
 * silently substituted witness, never a value borrowed from another
 * construct, and never Stage 2's own permissive "primary, else lexically
 * first" fallback (which never fails closed). An unresolvable pairing
 * abstains before the resolver is ever called.
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
import { ABSTRACT_LINEAGE_OVERRIDES } from "./runtime-routing.js";

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
 * A Stage-3-level abstention: distinct from `suppressedResult` (an upstream
 * gate decision — see file header) and distinct from the resolver's own
 * `abstained` verdicts (which only exist once the resolver has actually run).
 * This one fires BEFORE the resolver is called, when the lineage adapter
 * cannot resolve the requested (construct, lineage) pairing at all.
 */
function unsupportedLineageResult(depthMode, occurrence) {
  return Object.freeze({
    suppressed: false,
    suppressionReason: null,
    abstained: true,
    abstentionReasonCode: "UNSUPPORTED_LINEAGE",
    primaryConstruct: null,
    primaryLineage: null,
    active: Object.freeze([]),
    sourcePanelOnly: Object.freeze([]),
    disagreements: Object.freeze([]),
    editorialJuxtapositions: Object.freeze([]),
    abstentions: Object.freeze([]),
    renderPlan: null,
    depthMode: resolveDepthMode(depthMode),
    occurrence: resolveOccurrence(occurrence),
  });
}

/*
 * Deliberately empty. Every abstract label maps only to the identically
 * named key on that construct today (`"primary"` on every construct;
 * `"variant"` only where the construct itself declares one — currently
 * fourRivers alone). A future PRODUCT-OWNER decision to route a construct's
 * abstract rotation slot to a DIFFERENT named witness lineage (e.g. routing
 * fiveMountains' "variant" to one of its several competing witnesses) is a
 * content/editorial decision this module has no authority to make on its
 * own — it belongs here, one explicit entry per decision, never inferred.
 */
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

/**
 * The lineage adapter (see file header). Returns the canonical heritage
 * registry lineage id for this EXACT construct, or `null` (abstain) if the
 * pairing cannot be resolved. Accepts either an abstract Reflection Engine
 * label (`"primary"`/`"variant"`) or an explicit canonical lineage id
 * (e.g. `"taiqing-siku"`) — both are validated identically: the result must
 * be a lineage key THIS construct's own registry record actually declares.
 * Never falls back to a different construct's data, never falls back to
 * "primary" when the request was for something else, and never upgrades or
 * alters what the resolved lineage record says.
 */
export function resolveHeritageLineage({ heritageConstruct, sourceLineage } = {}, heritageRegistry) {
  const record = heritageRegistry?.[heritageConstruct];
  if (!record || !record.lineages) return null;
  const override = ABSTRACT_LINEAGE_OVERRIDES[heritageConstruct]?.[sourceLineage];
  const candidate = override ?? sourceLineage;
  return hasOwn(record.lineages, candidate) ? candidate : null;
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

/*
 * Stage 2's `toResolvedEntry()` (resolver.js, frozen) does not copy
 * `sectionLocatorStatus`/`folioLocatorStatus` from the connector record onto
 * the entries it returns — that boundary predates this field pair. Reading
 * the SOURCE record's status for a connector-specific locator (as the prior
 * pass's `connectorEvidenceCard` fix does when the entry carries no status of
 * its own) can silently upgrade a connector whose own recorded locator is
 * weaker than its source's general standing — see
 * `five-forms-generative-overcoming-system` (`sectionLocatorStatus:
 * "RECORDED"` on the connector, `"VERIFIED"` on its source
 * `heritage-five-elements-taiqing`). Carrying the two fields through requires
 * either reopening the frozen resolver boundary or closing the gap here, at
 * the Stage-3 mapping layer that already owns the canonical connector
 * registry. This is the latter: an EXACT `connectorId` lookup against the
 * SAME `connectorRegistry` this call resolved against (the internally-bound
 * canonical one in production, the caller-supplied one on the test seam —
 * never a different or fallback registry), adding ONLY these two fields.
 * Everything else on the entry — disposition, relationshipAvailability,
 * gateReasons, evidenceStrength, membership, order — passes through
 * unchanged. A connectorId with no registry match (should not happen; the
 * entry came from this exact registry) leaves the entry untouched rather
 * than inventing a status.
 *
 * ENRICH, NEVER OVERWRITE: `entry.sectionLocatorStatus`/`folioLocatorStatus`
 * win when already present; the registry is consulted only as a fallback.
 * Today `toResolvedEntry()` never sets either field (see above), so
 * `entry.*` is always `undefined` here and this is a no-op in practice — but
 * an unconditional overwrite would silently discard a future resolver
 * enhancement that DID start copying these fields onto resolved entries,
 * which is exactly the kind of regression this module exists to prevent
 * elsewhere (see the file header's "WHY GATES FAIL CLOSED..." and the
 * connector-vs-source precedence this same function was added to enforce).
 * `??` is safe specifically because the STATUS fields are a closed enum that
 * always defaults to the string `"NOT_RECORDED"` in `registry.js`'s
 * `connectorRecord()` factory — `null` is used there for the locator VALUE
 * fields, never for the status fields, so there is no legitimate `null`
 * status this would misread as "absent".
 */
function withConnectorLocatorStatus(entry, connectorRegistry) {
  const raw = connectorRegistry?.[entry.connectorId];
  if (!raw) return entry;
  return Object.freeze({
    ...entry,
    sectionLocatorStatus: entry.sectionLocatorStatus ?? raw.sectionLocatorStatus,
    folioLocatorStatus: entry.folioLocatorStatus ?? raw.folioLocatorStatus,
  });
}

function mapResolverResult(result, depthMode, occurrence, connectorRegistry) {
  return Object.freeze({
    suppressed: false,
    suppressionReason: null,
    abstained: result.abstained,
    abstentionReasonCode: result.abstentionReasonCode,
    primaryConstruct: result.primaryConstruct,
    primaryLineage: result.primaryLineage,
    active: Object.freeze(result.activeConnectors.map((e) => withConnectorLocatorStatus(e, connectorRegistry))),
    sourcePanelOnly: Object.freeze(result.sourcePanels.map((e) => withConnectorLocatorStatus(e, connectorRegistry))),
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

  // The lineage adapter: fail closed on an unresolvable (construct, lineage)
  // pairing BEFORE the resolver is ever invoked — see file header. This
  // deliberately pre-empts Stage 2's own permissive fallback
  // ("primary, else lexically first"), which never fails closed.
  const canonicalLineage = resolveHeritageLineage({ heritageConstruct, sourceLineage }, heritageRegistry);
  if (canonicalLineage === null) {
    return unsupportedLineageResult(depthMode, occurrence);
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
    // resolver's own declared RESOLVER_DEPENDS_ON fields, using the
    // ADAPTER's resolved canonical lineage rather than the caller's raw
    // (possibly abstract) sourceLineage string.
    readingState: { heritageConstruct, sourceLineage: canonicalLineage },
    conditionContext,
    runtimeBindingContext,
    rotationState,
    depthMode,
    occurrence,
  });

  return mapResolverResult(result, depthMode, occurrence, connectorRegistry);
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
  // `rotationState` deliberately excluded — see the file header's "WHY
  // rotationState IS NOT IN THE PRODUCT-FACING CONTRACT" section. Passing it
  // here throws via the "unexpected field" check below, same as a registry.
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
