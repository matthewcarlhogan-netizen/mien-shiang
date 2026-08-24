/*
 * Stage 2: the deterministic heritage connector resolver.
 *
 * This module answers one question: given an interpreted reading state, a
 * selected heritage construct/lineage, a presentation depth and a
 * deterministic occurrence, which registered connector-graph relationships
 * are eligible to be shown, in what structured form, and why?
 *
 * It is deliberately NOT a prose engine. It produces no sentences — only
 * structured, traceable selections over the Stage 1 registries. Prose
 * composition (src/qise/reflection.js) is Stage 3 and is not touched here.
 *
 * ── WHY THIS FILE HAS NO IMPORTS FROM src/qise/ ────────────────────────────
 * `resolveHeritageConnections` is a pure function of its arguments. Every
 * registry it needs is INJECTED, not imported at module scope, so a test can
 * swap in a synthetic registry without mutating runtime state (the same
 * reasoning `createHeritageRegistry(corpus)` in registry.js already uses).
 * The deterministic hashing below duplicates the ~8-line FNV-1a primitive
 * already in src/qise/passages.js (`seededIndex`) rather than importing it,
 * so `src/heritage/` stays free of a dependency on `src/qise/` in this
 * direction — registry.js already depends on qise/reflection-corpus.js for
 * legacy prose content, but a resolver that reasons about connectors has no
 * reason to depend on the passage engine's utility belt.
 *
 * ── WHY readingState.availability IS NOT CONSULTED ─────────────────────────
 * `readingState.availability` (read / abstained_*) reports whether TODAY'S
 * qi-se compass measurement succeeded. Connector-graph availability is a
 * different, STATIC question: can this product's capture modality (a 2D
 * frontal photograph, no depth, no ear detector) ever support this
 * historical claim at all? Folding today's qi-se success into that answer
 * would be exactly the conflation Stage 1 forbids: modern measured Qi Se
 * would end up silently promoting a connector that mentions heritageQiSe
 * from HERITAGE_ONLY to FULLY_AVAILABLE on a good capture day, which is
 * precisely "today's measured Qi Se proves the traditional appraisal". So
 * relationshipAvailability below is derived ONLY from the registries'
 * declared `measurementAvailability` fields, never from `readingState`.
 * `dependsOn` at the bottom of this file names exactly what state fields
 * this resolver reads, the same declared-dependency discipline
 * `reflection.js`'s COMPONENTS use.
 */

import { checkNegativeRelationshipInvariants } from "./validator.js";

export const RELATIONSHIP_AVAILABILITY = Object.freeze([
  "FULLY_AVAILABLE",
  "PARTIALLY_AVAILABLE",
  "HERITAGE_ONLY",
  "UNAVAILABLE_FROM_CAPTURE",
  "SOURCE_ONLY",
]);

export const DEPTH_MODES = Object.freeze(["SUMMARY", "STANDARD", "SOURCE_DEEP"]);
const DEPTH_ACTIVE_CAP = Object.freeze({ SUMMARY: 2, STANDARD: 5, SOURCE_DEEP: Infinity });

/** Fields this resolver reads from readingState. See file header. */
export const RESOLVER_DEPENDS_ON = Object.freeze(["heritageConstruct", "sourceLineage"]);

/* ── deterministic primitives (duplicated from qise/passages.js on purpose; see header) ── */

function seededIndex(seed, length) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % Math.max(1, length);
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function coprimeStride(total) {
  if (total <= 2) return 1;
  let step = Math.max(1, Math.round(total * 0.6180339887));
  while (gcd(step, total) !== 1) step = (step % total) + 1;
  return step;
}

/** Rotate a stably-ordered array deterministically. Never mutates `items`. */
function rotateDeterministically(items, seed, occurrence) {
  const total = items.length;
  if (total <= 1) return items.slice();
  const offset = seededIndex(seed, total);
  const normalizedOccurrence = (((occurrence | 0) % total) + total) % total;
  const stride = coprimeStride(total);
  const out = [];
  for (let i = 0; i < total; i++) {
    const walk = (offset + (normalizedOccurrence + i) * stride) % total;
    out.push(items[walk]);
  }
  return out;
}

/* ── measurement-signal classification (pure, static, registry-only) ────── */

const MEASUREMENT_CLASS = Object.freeze({
  SUPPORTED_2D: "capturable",
  CONDITIONALLY_SUPPORTED: "capturable",
  CAMERA_GEOMETRY_INSUFFICIENT: "practical",
  UNSUPPORTED: "practical",
  MODERN_MAPPING_UNSUPPORTED: "practical",
  UNMEASURABLE: "categorical",
  PERMANENTLY_ABSTAIN: "categorical",
  NOT_RECORDED: "unknown",
});

const classifyMeasurement = (value) => MEASUREMENT_CLASS[value] || "unknown";

/**
 * The static measurement signal for one connector participant. CONSTITUENT
 * and RELATED_SYSTEM participants carry no measurement field in Stage 1's
 * schema, so they contribute "unknown" rather than a guess.
 */
function participantMeasurementSignal(participant, { heritageRegistry, conceptRegistry, primaryConstruct, primaryLineage }) {
  if (participant.nodeType === "HERITAGE_CONCEPT") {
    const concept = conceptRegistry?.[participant.conceptId ?? participant.participantId];
    return concept ? concept.measurementAvailability : "NOT_RECORDED";
  }
  if (participant.nodeType === "CONSTRUCT") {
    const constructId = participant.constructId ?? participant.participantId;
    const record = heritageRegistry?.[constructId];
    if (!record || !record.lineages) return "NOT_RECORDED";
    const lineageId = constructId === primaryConstruct && primaryLineage && record.lineages[primaryLineage]
      ? primaryLineage
      : (record.lineages.primary ? "primary" : Object.keys(record.lineages).sort()[0]);
    const lineage = lineageId ? record.lineages[lineageId] : null;
    return lineage ? lineage.measurementAvailability : "NOT_RECORDED";
  }
  return "NOT_RECORDED";
}

/**
 * Static, per-connector relationship availability. A function of the
 * connector's own `measurementAvailability`, its participants' registry
 * signals, any declared `historicalStates` overrides, and — for exactly one
 * distinction — `runtimePolicy`. Never of readingState. See file header.
 *
 * FULLY_AVAILABLE / PARTIALLY_AVAILABLE are pure measurement facts: does this
 * product's capture modality support some or all of what the relationship
 * involves. When NOTHING is capturable, two different things can still be
 * true, and they read very differently to a user: the source material may
 * still be worth showing as attributed tradition (HERITAGE_ONLY — this is
 * exactly what `five-mountains-mutual-facing-fullness` is FOR: 太清神鑑
 * describes a fullness/mutual-facing rule this camera cannot verify, but the
 * connector's own `runtimePolicy: HERITAGE_PRESENTATION_ALLOWED` says show it
 * anyway, as tradition, never as "your face"), or there may be nothing
 * appropriate to surface at all right now (UNAVAILABLE_FROM_CAPTURE — a
 * RESEARCH_ONLY or contested connector with no capturable signal). That
 * second distinction is a policy question, not a measurement one, which is
 * why `runtimePolicy` enters here and only here.
 */
function classifyRelationshipAvailability(connector, context) {
  const signals = [connector.measurementAvailability];
  for (const participant of connector.participants) {
    signals.push(participantMeasurementSignal(participant, context));
  }
  for (const state of connector.historicalStates || []) {
    signals.push(state.measurementAvailability);
  }

  const classes = new Set(signals.map(classifyMeasurement));

  if (classes.size === 1 && classes.has("capturable")) return "FULLY_AVAILABLE";
  if (classes.has("capturable")) return "PARTIALLY_AVAILABLE";
  return connector.runtimePolicy === "HERITAGE_PRESENTATION_ALLOWED" ? "HERITAGE_ONLY" : "UNAVAILABLE_FROM_CAPTURE";
}

/* ── condition AST evaluation (Stage 1's six node types only) ────────────── */

/**
 * Evaluate a connector's (already-validated) conditionExpression.
 *
 * Returns `{ satisfied, resolved, reason }`. `resolved: false` means "cannot
 * safely say" — the caller must treat that as ineligible, never as a guess in
 * either direction. A STATE node resolves true only when its declared
 * historicalState's OWN measurementAvailability classifies as capturable;
 * this is the only place STATE can become true, and it is a static registry
 * fact, never an inference from readingState or from raw measurement — the
 * explicit binding the task requires simply does not exist for heritageQiSe
 * or shen (both UNMEASURABLE), so their STATE nodes can never resolve true.
 */
export function evaluateConditionExpression(expr, connector) {
  if (expr === null || expr === undefined) {
    return { satisfied: true, resolved: true, reason: "NO_CONDITION" };
  }
  const participantIds = new Set((connector.participants || []).map((p) => p.participantId));
  const statesById = new Map((connector.historicalStates || []).map((s) => [s.stateId, s]));

  const evaluate = (node) => {
    if (!node || typeof node !== "object") {
      return { satisfied: false, resolved: false, reason: "MALFORMED_NODE" };
    }
    switch (node.type) {
      case "ALL": {
        const results = (node.operands || []).map(evaluate);
        const resolved = results.every((r) => r.resolved);
        return { satisfied: resolved && results.every((r) => r.satisfied), resolved, reason: resolved ? null : "UNRESOLVED_OPERAND" };
      }
      case "ANY": {
        const results = (node.operands || []).map(evaluate);
        const satisfiedOne = results.some((r) => r.resolved && r.satisfied);
        const allResolved = results.every((r) => r.resolved);
        if (satisfiedOne) return { satisfied: true, resolved: true, reason: null };
        if (allResolved) return { satisfied: false, resolved: true, reason: null };
        return { satisfied: false, resolved: false, reason: "UNRESOLVED_OPERAND" };
      }
      case "NOT": {
        const r = evaluate(node.operand);
        if (!r.resolved) return { satisfied: false, resolved: false, reason: "UNRESOLVED_OPERAND" };
        return { satisfied: !r.satisfied, resolved: true, reason: null };
      }
      case "PRESENT":
        return { satisfied: participantIds.has(node.participantId), resolved: true, reason: null };
      case "ABSENT":
        return { satisfied: !participantIds.has(node.participantId), resolved: true, reason: null };
      case "STATE": {
        const state = statesById.get(node.stateId);
        if (!state || state.participantId !== node.participantId) {
          return { satisfied: false, resolved: false, reason: "UNKNOWN_STATE" };
        }
        const cls = classifyMeasurement(state.measurementAvailability);
        if (cls === "capturable") return { satisfied: true, resolved: true, reason: null };
        if (cls === "categorical") return { satisfied: false, resolved: true, reason: "STATE_CATEGORICALLY_UNMEASURABLE" };
        return { satisfied: false, resolved: false, reason: "STATE_UNRESOLVED" };
      }
      default:
        return { satisfied: false, resolved: false, reason: "UNKNOWN_NODE_TYPE" };
    }
  };

  return evaluate(expr);
}

/* ── negative-rule cross-check (data-driven, complements validator.js) ───── */

/**
 * `negativeRelationshipRegistry`-driven check: if a connector's participants
 * jointly cover both `fromRef` and `toRef` of an ACTIVE negative rule, it
 * violates that rule. This is generic and data-driven — it does not need to
 * know the specific rule IDs — and it complements (not replaces)
 * `checkNegativeRelationshipInvariants`, which additionally covers the
 * `historicalStates`-based shen-unmeasurable case that a pure participant-ref
 * pair cannot express.
 */
function negativeRuleViolations(connector, negativeRelationshipRegistry) {
  const refs = new Set((connector.participants || []).map((p) =>
    p.conceptId ?? p.constructId ?? p.constituentId ?? p.relatedSystemId ?? p.participantId));
  const violated = [];
  for (const rule of Object.values(negativeRelationshipRegistry || {})) {
    if (rule.status !== "ACTIVE") continue;
    if (refs.has(rule.fromRef) && refs.has(rule.toRef)) violated.push(rule.negativeRuleId);
  }
  return violated;
}

/* ── connector -> trace entry (never mutates the source connector) ───────── */

function toResolvedEntry(connector, { relationshipAvailability, conditionResolution, disposition, disagreementIds }) {
  return Object.freeze({
    connectorId: connector.connectorId,
    relationshipType: connector.relationshipType,
    relationshipDirection: connector.relationshipDirection,
    collectiveMode: connector.collectiveMode ?? null,
    participants: connector.participants,
    sourceId: connector.sourceId,
    supportingSourceIds: connector.supportingSourceIds || [],
    evidenceClass: connector.evidenceClass,
    evidenceStrength: connector.evidenceStrength,
    textualLayer: connector.textualLayer,
    sectionLocator: connector.sectionLocator,
    folioLocator: connector.folioLocator,
    runtimePolicy: connector.runtimePolicy,
    prohibitedForUserInference: connector.prohibitedForUserInference,
    sourceRuleGroupId: connector.sourceRuleGroupId ?? null,
    disagreementIds: disagreementIds || [],
    relationshipAvailability,
    conditionResolution,
    disposition,
  });
}

/* ── the pure resolver ────────────────────────────────────────────────────── */

function abstainedResult(reasonCode, depthMode, occurrence) {
  return Object.freeze({
    abstained: true,
    abstentionReasonCode: reasonCode,
    primaryConstruct: null,
    primaryLineage: null,
    activeConnectors: Object.freeze([]),
    unavailableRelations: Object.freeze([]),
    disagreementPanels: Object.freeze([]),
    editorialJuxtapositions: Object.freeze([]),
    sourcePanels: Object.freeze([]),
    renderPlan: Object.freeze({
      relationshipOrder: Object.freeze([]),
      componentSlots: Object.freeze([]),
      wordingVariantIndices: Object.freeze({}),
      connectorSelectionKey: `abstained|${reasonCode}`,
      presentationMode: depthMode,
    }),
    trace: Object.freeze([{ step: "resolvePrimaryConstruct", outcome: "abstained", reasonCode }]),
  });
}

/**
 * The pure Stage 2 resolver. Every registry is injected — there is no
 * fallback to a runtime default here on purpose (see file header); use
 * `resolveHeritageConnectionsWithDefaults` for that.
 */
export function resolveHeritageConnections({
  heritageRegistry,
  conceptRegistry,
  connectorRegistry,
  disagreementRegistry,
  negativeRelationshipRegistry,
  compositionPolicies,
  readingState,
  rotationState = null,
  depthMode = "STANDARD",
  occurrence = 0,
} = {}) {
  const trace = [];
  const resolvedDepthMode = DEPTH_MODES.includes(depthMode) ? depthMode : "STANDARD";
  const resolvedOccurrence = Number.isFinite(occurrence) ? Math.max(0, occurrence | 0) : 0;

  // 1-2. accept readingState, resolve primary construct.
  const requestedConstruct = readingState?.heritageConstruct;
  const primaryConstruct = requestedConstruct && heritageRegistry && heritageRegistry[requestedConstruct]
    ? requestedConstruct
    : null;
  if (!primaryConstruct) {
    return abstainedResult("UNKNOWN_HERITAGE_CONSTRUCT", resolvedDepthMode, resolvedOccurrence);
  }
  const constructRecord = heritageRegistry[primaryConstruct];

  // 3. resolve allowed lineage/source state.
  const requestedLineage = readingState?.sourceLineage;
  const lineageKeys = Object.keys(constructRecord.lineages || {}).sort();
  const primaryLineage = requestedLineage && constructRecord.lineages?.[requestedLineage]
    ? requestedLineage
    : (constructRecord.lineages?.primary ? "primary" : (lineageKeys[0] || null));
  trace.push({
    step: "resolvePrimaryLineage",
    outcome: primaryLineage === requestedLineage ? "requested" : "fell-back",
    primaryLineage,
  });

  const context = { heritageRegistry, conceptRegistry, primaryConstruct, primaryLineage };

  // 4. enumerate connector candidates involving the primary construct.
  // Sorted by connectorId FIRST — this is what makes the result independent
  // of the injected registry's own key/insertion order.
  const allConnectors = Object.values(connectorRegistry || {})
    .slice()
    .sort((a, b) => a.connectorId.localeCompare(b.connectorId));

  const candidates = allConnectors.filter((connector) =>
    (connector.participants || []).some((p) => {
      if (p.nodeType !== "CONSTRUCT") return false;
      const refId = p.constructId ?? p.participantId;
      if (refId !== primaryConstruct) return false;
      return !p.lineageId || p.lineageId === primaryLineage;
    }));

  const active = [];
  const unavailable = [];
  const sourcePanels = [];

  for (const connector of candidates) {
    const relationshipAvailability = classifyRelationshipAvailability(connector, context);

    // 5. reject any connector blocked by source/runtime policy or the
    // Stage 1 safety lock.
    const negativeErrors = [];
    checkNegativeRelationshipInvariants(connector, negativeErrors);
    const dataDrivenViolations = negativeRuleViolations(connector, negativeRelationshipRegistry);
    const blockedByNegativeRule = negativeErrors.length > 0 || dataDrivenViolations.length > 0;
    const lockOk = connector.prohibitedForUserInference === true;

    // 6-7. participant availability + bounded conditionExpression.
    const conditionResolution = evaluateConditionExpression(connector.conditionExpression, connector);

    // 8. attach first-class disagreements (construct-level, plus any the
    // connector explicitly references).
    const disagreementIds = collectDisagreementIds(connector, primaryConstruct, disagreementRegistry);

    if (blockedByNegativeRule || !lockOk) {
      trace.push({
        step: "negativeRuleGate",
        connectorId: connector.connectorId,
        outcome: "blocked",
        reasons: [...negativeErrors, ...dataDrivenViolations, ...(lockOk ? [] : ["PROHIBITED_FOR_USER_INFERENCE_UNSET"])],
      });
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability,
        conditionResolution,
        disposition: "BLOCKED_NEGATIVE_RULE",
        disagreementIds,
      }));
      continue;
    }

    if (!conditionResolution.resolved || !conditionResolution.satisfied) {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability,
        conditionResolution,
        disposition: "CONDITION_UNMET",
        disagreementIds,
      }));
      continue;
    }

    if (connector.runtimePolicy === "SOURCE_PANEL_ONLY") {
      sourcePanels.push(toResolvedEntry(connector, {
        relationshipAvailability: "SOURCE_ONLY",
        conditionResolution,
        disposition: "SOURCE_PANEL",
        disagreementIds,
      }));
      continue;
    }

    if (connector.runtimePolicy === "RESEARCH_ONLY") {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability,
        conditionResolution,
        disposition: "RESEARCH_ONLY",
        disagreementIds,
      }));
      continue;
    }

    // runtimePolicy === "HERITAGE_PRESENTATION_ALLOWED": classifyRelationshipAvailability
    // never returns UNAVAILABLE_FROM_CAPTURE for this policy (see its doc
    // comment), so every connector reaching here is presentable — as a fully
    // connected reading, a partial one, or pure attributed tradition.
    active.push(toResolvedEntry(connector, {
      relationshipAvailability,
      conditionResolution,
      disposition: "ACTIVE",
      disagreementIds,
    }));
  }

  // 8 (continued) / 9. construct-level disagreement panels, independent of
  // which specific connectors are active — the disagreement is about the
  // CONSTRUCT's historical record, not about any one presented relationship.
  const disagreementPanels = Object.values(disagreementRegistry || {})
    .filter((d) => d.target?.targetType === "CONSTRUCT" && d.target?.targetRef === primaryConstruct)
    .slice()
    .sort((a, b) => a.disagreementId.localeCompare(b.disagreementId))
    .map((d) => Object.freeze({ ...d, positions: d.positions || [] }));

  // The rotation SEED deliberately excludes occurrence: `rotateDeterministically`
  // already takes occurrence as its own walk parameter (mirroring
  // reflection.js's stateKey-seeded-offset + coprime-stride-per-occurrence
  // split). Folding occurrence into the seed string TOO would let the two
  // effects cancel each other out on small arrays — exactly the degenerate
  // case a first draft of this file shipped with, caught by the resolver's
  // own "occurrence causes only approved deterministic variation" test.
  const rotationSeed = `heritageConstruct=${primaryConstruct}|sourceLineage=${primaryLineage}|depthMode=${resolvedDepthMode}`;
  const connectorSelectionKey = `${rotationSeed}|occurrence=${resolvedOccurrence}`;

  // 10. optionally select eligible editorial juxtaposition. Depth-gated:
  // a SUMMARY presentation never juxtaposes.
  const editorialJuxtapositions = resolvedDepthMode === "SUMMARY"
    ? []
    : selectEditorialJuxtapositions({
      compositionPolicies,
      candidateIds: dedupeSortedIds([...active, ...sourcePanels].map((e) => e.connectorId)),
      seed: rotationSeed,
    });

  // 11. deterministically order/select relationships for presentation. The
  // ACTIVE/SOURCE_PANEL/UNAVAILABLE arrays above stay in stable connectorId
  // order (occurrence-invariant); only the render-plan's presentation order
  // rotates with occurrence.
  const cap = DEPTH_ACTIVE_CAP[resolvedDepthMode];
  const stableIds = active.map((e) => e.connectorId);
  const recentSet = new Set(rotationState?.recentConnectorIds || []);
  const deprioritized = [...stableIds].sort((a, b) => {
    const ra = recentSet.has(a) ? 1 : 0;
    const rb = recentSet.has(b) ? 1 : 0;
    return ra !== rb ? ra - rb : a.localeCompare(b);
  });
  const rotated = rotateDeterministically(deprioritized, rotationSeed, resolvedOccurrence);
  const relationshipOrder = rotated.slice(0, cap === Infinity ? rotated.length : cap);

  const wordingVariantIndices = {};
  const WORDING_MODULUS = 97; // no wording corpus exists yet; see file header.
  for (const id of [...relationshipOrder, ...sourcePanels.map((e) => e.connectorId)]) {
    wordingVariantIndices[id] = seededIndex(`${connectorSelectionKey}|${id}|wording`, WORDING_MODULUS);
  }

  const componentSlots = [
    ...relationshipOrder.map((id) => ({ id, kind: "connector" })),
    ...(resolvedDepthMode !== "SUMMARY" ? sourcePanels.map((e) => ({ id: e.connectorId, kind: "sourcePanel" })) : []),
    ...disagreementPanels.map((d) => ({ id: d.disagreementId, kind: "disagreement" })),
    ...editorialJuxtapositions.map((j) => ({ id: j.policyId, kind: "editorial" })),
  ];

  trace.push({
    step: "enumerateCandidates",
    primaryConstruct,
    primaryLineage,
    candidateCount: candidates.length,
    activeCount: active.length,
    sourcePanelCount: sourcePanels.length,
    unavailableCount: unavailable.length,
  });

  return Object.freeze({
    abstained: false,
    abstentionReasonCode: null,
    primaryConstruct,
    primaryLineage,
    activeConnectors: Object.freeze(active),
    unavailableRelations: Object.freeze(unavailable),
    disagreementPanels: Object.freeze(disagreementPanels),
    editorialJuxtapositions: Object.freeze(editorialJuxtapositions),
    sourcePanels: resolvedDepthMode === "SUMMARY" ? Object.freeze([]) : Object.freeze(sourcePanels),
    renderPlan: Object.freeze({
      relationshipOrder: Object.freeze(relationshipOrder),
      componentSlots: Object.freeze(componentSlots),
      wordingVariantIndices: Object.freeze(wordingVariantIndices),
      connectorSelectionKey,
      presentationMode: resolvedDepthMode,
    }),
    trace: Object.freeze(trace),
  });
}

function dedupeSortedIds(ids) {
  return [...new Set(ids)].sort();
}

/**
 * Disagreements attached to a candidate connector: explicit
 * `connector.disagreementIds`, plus any registry disagreement whose target is
 * the primary construct itself (Stage 1's actual disagreement records target
 * CONSTRUCTs, not connectors — see docs/HERITAGE_VALIDATOR_FALSIFICATION.md).
 * Never harmonizes: every position on an OPEN/PARALLEL disagreement is kept.
 */
function collectDisagreementIds(connector, primaryConstruct, disagreementRegistry) {
  const explicit = connector.disagreementIds || [];
  const constructLevel = Object.values(disagreementRegistry || {})
    .filter((d) => d.target?.targetType === "CONSTRUCT" && d.target?.targetRef === primaryConstruct)
    .map((d) => d.disagreementId);
  return dedupeSortedIds([...explicit, ...constructLevel]);
}

/**
 * Editorial juxtaposition is entirely separate from the historical graph. It
 * is never added to activeConnectors, and `historicalRelationshipAsserted` is
 * always copied verbatim from the policy record — never overridden here.
 */
function selectEditorialJuxtapositions({ compositionPolicies, candidateIds, seed }) {
  if (candidateIds.length < 2) return [];
  const policies = Object.values(compositionPolicies || {})
    .slice()
    .sort((a, b) => a.policyId.localeCompare(b.policyId));

  const out = [];
  for (const policy of policies) {
    const maxItems = Math.max(0, Math.min(policy.maxItems ?? 0, candidateIds.length));
    if (maxItems < 2) continue;
    const rotated = rotateDeterministically(candidateIds, `${seed}|${policy.policyId}`, 0);
    out.push(Object.freeze({
      policyId: policy.policyId,
      items: Object.freeze(rotated.slice(0, maxItems)),
      historicalRelationshipAsserted: policy.historicalRelationshipAsserted,
      requiresSeparateAttribution: policy.requiresSeparateAttribution,
      attributionMode: "separate",
      disclosureId: policy.disclosureId,
    }));
  }
  return out;
}

/**
 * Thin wrapper: fills in the real runtime registries so callers do not have
 * to. The pure resolver above never imports these itself (see file header).
 */
let cachedDefaults = null;
export async function resolveHeritageConnectionsWithDefaults(args = {}) {
  if (!cachedDefaults) {
    const [registryMod, negativeMod, policyMod, conceptMod] = await Promise.all([
      import("./registry.js"),
      import("./negative-relationships-registry.js"),
      import("./composition-policies-registry.js"),
      import("./concepts.js"),
    ]);
    cachedDefaults = {
      heritageRegistry: registryMod.HERITAGE_REGISTRY,
      connectorRegistry: registryMod.HERITAGE_CONNECTOR_REGISTRY,
      disagreementRegistry: registryMod.HERITAGE_DISAGREEMENT_REGISTRY,
      negativeRelationshipRegistry: negativeMod.HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
      compositionPolicies: policyMod.HERITAGE_COMPOSITION_POLICIES,
      conceptRegistry: conceptMod.HERITAGE_CONCEPT_REGISTRY,
    };
  }
  return resolveHeritageConnections({ ...cachedDefaults, ...args });
}
