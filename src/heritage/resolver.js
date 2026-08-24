/*
 * Stage 2: the deterministic heritage connector resolver.
 *
 * This module answers one question: given an interpreted reading state, a
 * selected heritage construct/lineage, injected runtime evidence about which
 * participants/historical states currently hold, a presentation depth and a
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
 * already in src/qise/passages.js (`seededIndex`) rather than importing it.
 *
 * ── THREE DIFFERENT QUESTIONS, NEVER COLLAPSED ─────────────────────────────
 * A first draft of this resolver conflated three genuinely separate
 * questions, and the correction below is organised around keeping them apart:
 *
 * 1. "Can this product's capture modality EVER support observing this?"
 *    A static registry fact — `measurementAvailability` on a connector, a
 *    construct's lineage, or a heritage concept. Answered by
 *    `classifyRelationshipAvailability`. NEVER used to decide whether a
 *    historical claim is TRUE.
 * 2. "Is this specific participant currently present, in THIS resolution?"
 *    A runtime fact, supplied by the caller via the injected
 *    `conditionContext.participants` map — never inferred from (1), from
 *    `readingState.availability`, or from anything else. Answered by
 *    `evaluateConditionExpression`'s PRESENT/ABSENT handling.
 * 3. "Has an explicitly authorised historical state been established?"
 *    Also a runtime fact, supplied via `conditionContext.states` — a
 *    `historicalState`'s declared `measurementAvailability` says what KIND of
 *    thing it is, not whether it currently holds. heritageQiSe and shen have
 *    no authorised binding from (1) or (2) into (3) — that binding does not
 *    exist in this codebase, so their STATE conditions can only ever resolve
 *    through an explicit, caller-supplied `conditionContext.states` entry.
 *
 * `readingState.availability` (read / abstained_*) answers a FOURTH question
 * — did today's qi-se compass measurement succeed — and is not consulted
 * anywhere in this file. Folding it into any of the three above is exactly
 * the "modern measured Qi Se proves the traditional appraisal" conflation
 * Stage 1 forbids.
 */

import { checkNegativeRelationshipInvariants } from "./validator.js";

export const RELATIONSHIP_AVAILABILITY = Object.freeze([
  "FULLY_AVAILABLE",
  "PARTIALLY_AVAILABLE",
  "HERITAGE_ONLY",
  "UNAVAILABLE_FROM_CAPTURE",
  "SOURCE_ONLY",
]);

/*
 * These are RESOLVER-INTERNAL presentation depths, not a second product
 * taxonomy. They loosely mirror src/qise/reading-tiers.js's Tier 1/2/3 split
 * (Today / Reading / Why-Study) but are not identical to it — a future
 * Stage 3 integration should map between them explicitly rather than assume
 * a 1:1 correspondence, which is why this file does not simply rename its
 * own values to "TIER_1" etc. DEPTH_MODE_TIER_GUIDANCE below records the
 * intended correspondence for that future work.
 *
 * The one binding rule right now: SOURCE_PANEL_ONLY material is
 * study/citation-panel content, and it is withheld until SOURCE_DEEP so it
 * cannot leak into the normal daily heritage surface (item 9).
 */
export const DEPTH_MODES = Object.freeze(["SUMMARY", "STANDARD", "SOURCE_DEEP"]);
export const DEPTH_MODE_TIER_GUIDANCE = Object.freeze({
  SUMMARY: "Roughly corresponds to reading-tiers.js Tier 1 (Today) — fastest, fewest relationships, never a source panel.",
  STANDARD: "Roughly corresponds to Tier 2 (Reading) — normal daily heritage surface. Still no source panels.",
  SOURCE_DEEP: "Roughly corresponds to Tier 3 (Why/Study) — the only depth where sourcePanels (SOURCE_PANEL_ONLY connectors) are populated.",
});
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

/**
 * Rotate a stably-ordered array deterministically. Never mutates `items`.
 * The SEED must not itself encode `occurrence` — `occurrence` is this
 * function's own walk parameter. Folding it into both would let the two
 * effects cancel out on small arrays (a real bug caught by this module's own
 * determinism test during Stage 2).
 */
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

/* ── measurement-signal classification: "can the capture modality observe this at all" ── */

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
 * Item 3 (Stage 2 review, round 4): a connector with NO CONSTRUCT participant
 * at all is not scoped to any construct's lineage — it is only ever a
 * candidate via the explicit concept-anchor mechanism (see
 * `conceptOnlyCandidates`), independent of which primary construct happens
 * to be selected. Used both to decide candidacy and, per-connector in the
 * main loop, to decide whether the SELECTED primary lineage may gate it at
 * all — it must not, since that lineage belongs to an unrelated construct.
 */
const isConceptOnlyConnector = (connector) => {
  const participants = connector.participants || [];
  return participants.length > 0 && participants.every((p) => p.nodeType !== "CONSTRUCT");
};

/**
 * The static measurement signal for one connector participant. This is
 * ALWAYS a registry fact (question 1 in the file header) — never runtime
 * evidence. CONSTITUENT and RELATED_SYSTEM participants carry no measurement
 * field in Stage 1's schema, so they contribute "unknown" rather than a guess.
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
 * Static, per-connector relationship availability (question 1). A function
 * of the connector's own `measurementAvailability`, its participants'
 * registry signals, any declared `historicalStates`' own
 * `measurementAvailability`, `runtimePolicy`, and the SELECTED LINEAGE's
 * restriction (see `resolveLineageRestriction`) — never of readingState, and
 * never of `conditionContext` (that is runtime evidence, question 2/3, a
 * different axis entirely; see `computeDisposition`).
 *
 * FULLY_AVAILABLE / PARTIALLY_AVAILABLE are pure measurement facts. When
 * NOTHING is capturable, two different things can still be true: the source
 * material may still be worth showing as attributed tradition (HERITAGE_ONLY
 * — this is exactly what `five-mountains-mutual-facing-fullness` is FOR),
 * or there may be nothing appropriate to surface at all right now
 * (UNAVAILABLE_FROM_CAPTURE — a RESEARCH_ONLY or contested connector with no
 * capturable signal). That split is a policy question, which is why
 * `runtimePolicy` enters here and only for that one distinction. A
 * HERITAGE_ONLY-restricted lineage forces the same ceiling regardless of the
 * raw per-participant signal, because the interpretive content selected for
 * this construct has itself been held back from full/connected presentation.
 */
function classifyRelationshipAvailability(connector, context, lineageRestriction) {
  const signals = [connector.measurementAvailability];
  for (const participant of connector.participants) {
    signals.push(participantMeasurementSignal(participant, context));
  }
  for (const state of connector.historicalStates || []) {
    signals.push(state.measurementAvailability);
  }

  const classes = new Set(signals.map(classifyMeasurement));

  let base;
  if (classes.size === 1 && classes.has("capturable")) base = "FULLY_AVAILABLE";
  else if (classes.has("capturable")) base = "PARTIALLY_AVAILABLE";
  else base = connector.runtimePolicy === "HERITAGE_PRESENTATION_ALLOWED" ? "HERITAGE_ONLY" : "UNAVAILABLE_FROM_CAPTURE";

  if (lineageRestriction === "HERITAGE_ONLY" && base !== "UNAVAILABLE_FROM_CAPTURE") return "HERITAGE_ONLY";
  return base;
}

/* ── source / lineage eligibility (a THIRD, independent gate: evidentiary standing) ─────── */

/**
 * Item 5: a numeric ladder over the EXISTING Stage 1 citation and evidence
 * enums (constants.js HERITAGE_CITATION_STATUSES / HERITAGE_VERIFICATION_STATUSES
 * verbatim — no new ladder invented, no rung relabelled). 0 = blocked,
 * 1 = source-panel ceiling, 2 = fully eligible for active presentation.
 *
 * `edition-recorded` and `verified` are DELIBERATELY separate Stage 1 rungs
 * (an edition is identified but not independently checked against it, vs.
 * independently checked) and must not collapse to the same strength — only
 * `verified` reaches full eligibility; `edition-recorded` (like
 * `work-recorded`) ceilings at SOURCE_PANEL. `attribution-contradicted` and
 * `source-required` stay blocked.
 *
 * Likewise `evidenceStrength`: only VERIFIED_PRIMARY/VERIFIED_SECONDARY/
 * CORROBORATED_NOT_VERIFIED ("verified or corroborated evidence") reach full
 * eligibility. RECORDED_NOT_VERIFIED — the weakest rung, and the one
 * `five-mountains-mutual-facing-fullness` currently carries — does not, even
 * when the SOURCE it cites is independently verified: the source being
 * solidly identified is a different fact from THIS CONNECTOR's specific
 * predicate having been checked against it.
 */
const CITATION_STRENGTH = Object.freeze({
  "source-required": 0,
  "attribution-contradicted": 0,
  "work-recorded": 1,
  "edition-recorded": 1,
  verified: 2,
});
const EVIDENCE_STRENGTH_LEVEL = Object.freeze({
  ABSTAINED: 0,
  RECORDED_NOT_VERIFIED: 1,
  CORROBORATED_NOT_VERIFIED: 2,
  VERIFIED_SECONDARY: 2,
  VERIFIED_PRIMARY: 2,
});
const strengthToEligibility = (strength) => (strength <= 0 ? "BLOCKED" : strength === 1 ? "SOURCE_PANEL_CEILING" : "ELIGIBLE");

/**
 * The SELECTED LINEAGE's own evidentiary strength — its `citationStatus` and
 * `evidenceStrength` (both first-class fields on every lineage record, per
 * HERITAGE_FIELD_MANIFEST.lineage), cross-checked against its own
 * `sourceId` in the injected sourceRegistry so a lineage cannot claim a
 * stronger citationStatus than the source record it actually cites backs up.
 * The weakest of the three wins.
 *
 * Item 1: an UNRESOLVABLE lineage.sourceId (missing from sourceRegistry)
 * fails CLOSED — it contributes strength 0, never a fallback to the
 * lineage's own denormalized citationStatus. A lineage claiming
 * `citationStatus: "verified"` while citing a source that does not exist in
 * the injected registry must not receive ACTIVE eligibility on the strength
 * of that unverifiable claim alone.
 */
/**
 * Item 3 (Stage 2 review, round 4): `lineageRecord === undefined` means "not
 * applicable" — this connector is not scoped to any particular construct's
 * lineage at all (a concept-only connector like shen-requires-form, whose
 * candidacy comes from an explicit concept anchor, not from the primary
 * construct). That must not restrict eligibility at all, so it contributes
 * no ceiling (+Infinity is absorbed by the Math.min below). `null` (or any
 * other falsy, non-undefined value) means "applicable, but genuinely
 * missing/unresolved" and still fails closed to 0, per item 1.
 */
function lineageSourceStrength(lineageRecord, sourceRegistry) {
  if (lineageRecord === undefined) return Number.POSITIVE_INFINITY;
  if (!lineageRecord) return 0;
  const citationStrength = CITATION_STRENGTH[lineageRecord.citationStatus] ?? 0;
  const evidenceStrength = EVIDENCE_STRENGTH_LEVEL[lineageRecord.evidenceStrength] ?? 1;
  const sourceRecord = sourceRegistry?.[lineageRecord.sourceId];
  const sourceRecordStrength = sourceRecord ? (CITATION_STRENGTH[sourceRecord.citationStatus] ?? 0) : 0;
  return Math.min(citationStrength, evidenceStrength, sourceRecordStrength);
}

/**
 * "ELIGIBLE" — the connector's own source citation AND its OWN evidenceStrength
 *   AND the selected lineage's evidentiary standing are all solid; no ceiling.
 * "SOURCE_PANEL_CEILING" — real, identified material, but not yet located or
 *   verified well enough (on any side) for active presentation; may still
 *   appear in a source panel.
 * "BLOCKED" — no usable source at all, or an actively contradicted
 *   attribution, on either side.
 * "UNKNOWN_SOURCE" — connector.sourceId is not in the injected sourceRegistry
 *   (checked first and reported distinctly, since it is a different failure
 *   from "the source exists but is weak").
 *
 * Item 1/5: the connector's own source citation, the connector's OWN
 * `evidenceStrength` (a source being independently verified is not the same
 * fact as THIS connector's specific predicate having been checked against
 * it — see the ladder doc comment above), and the selected lineage's
 * evidentiary standing are all reconciled CONSERVATIVELY — the combined
 * result is the WEAKEST of the three, never the strongest. A connector
 * citing a verified source must not be promoted to active presentation
 * merely because that citation looks solid, if the connector's OWN
 * evidenceStrength is unverified, or if the reading state's selected
 * lineage for this construct is itself held at work-recorded, unverified
 * evidence, or worse.
 */
export function resolveSourceEligibility(connector, lineageRecord, sourceRegistry) {
  const source = sourceRegistry?.[connector.sourceId];
  if (!source) return "UNKNOWN_SOURCE";
  const connectorCitationStrength = CITATION_STRENGTH[source.citationStatus] ?? 0;
  const connectorEvidenceStrength = EVIDENCE_STRENGTH_LEVEL[connector.evidenceStrength] ?? 1;
  const combinedStrength = Math.min(
    connectorCitationStrength,
    connectorEvidenceStrength,
    lineageSourceStrength(lineageRecord, sourceRegistry),
  );
  return strengthToEligibility(combinedStrength);
}

/**
 * The SELECTED CANONICAL LINEAGE's own restriction — a property of which
 * lineage the reading state has chosen for the primary construct, computed
 * once per resolution and applied uniformly to every candidate connector for
 * that construct (connectors reference a construct, not a specific lineage,
 * in Stage 1's schema). "ABSTAIN" means the lineage itself declares
 * `availability: "abstention"` or `terminationState: "abstain"` — nothing
 * for this construct is promoted while that holds, matching the existing
 * abstention semantics in reading-state.js/reflection.js exactly rather than
 * inventing a parallel one.
 */
export function resolveLineageRestriction(lineageRecord) {
  if (!lineageRecord) return "UNKNOWN";
  if (lineageRecord.availability === "abstention" || lineageRecord.terminationState === "abstain") return "ABSTAIN";
  if (lineageRecord.runtimeStatus === "RESEARCH_ONLY") return "RESEARCH_ONLY";
  if (lineageRecord.runtimeStatus === "HERITAGE_ONLY") return "HERITAGE_ONLY";
  return "NONE";
}

/* ── condition AST evaluation: runtime evidence ONLY, never measurement-capability ──────── */

/**
 * Evaluate a connector's (already schema/validator-checked) conditionExpression
 * against explicitly injected runtime evidence. Returns
 * `{ satisfied, resolved, reason }`; `resolved: false` means "cannot safely
 * say" and the caller must treat that as ineligible, never as a guess in
 * either direction.
 *
 * `conditionContext` shape (all optional; absence means "nothing known"):
 * {
 *   participants: { [participantId]: "PRESENT" | "ABSENT" | "UNKNOWN" },
 *   states: { ["participantId:stateId"]: "SATISFIED" | "UNSATISFIED" | "UNKNOWN" },
 * }
 *
 * This function reads NOTHING else — not `historicalState.measurementAvailability`
 * (that answers "what kind of thing is this", not "does it currently hold"),
 * not `readingState`, not the connector's own `measurementAvailability`. A
 * STATE node additionally requires the referenced state to be DECLARED on
 * the connector's own `historicalStates` — the connector defines the
 * vocabulary, `conditionContext` supplies the runtime status.
 */
export function evaluateConditionExpression(expr, connector, conditionContext = null) {
  if (expr === null || expr === undefined) {
    return { satisfied: true, resolved: true, reason: "NO_CONDITION" };
  }
  const declaredParticipants = new Set((connector.participants || []).map((p) => p.participantId));
  const declaredStates = new Map((connector.historicalStates || []).map((s) => [s.stateId, s]));
  const participantStatus = conditionContext?.participants || {};
  const stateStatus = conditionContext?.states || {};

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
      case "PRESENT": {
        if (!declaredParticipants.has(node.participantId)) {
          return { satisfied: false, resolved: false, reason: "UNDECLARED_PARTICIPANT" };
        }
        const status = participantStatus[node.participantId];
        if (status === "PRESENT") return { satisfied: true, resolved: true, reason: null };
        if (status === "ABSENT") return { satisfied: false, resolved: true, reason: null };
        return { satisfied: false, resolved: false, reason: "PARTICIPANT_STATUS_UNKNOWN" };
      }
      case "ABSENT": {
        if (!declaredParticipants.has(node.participantId)) {
          return { satisfied: false, resolved: false, reason: "UNDECLARED_PARTICIPANT" };
        }
        const status = participantStatus[node.participantId];
        if (status === "ABSENT") return { satisfied: true, resolved: true, reason: null };
        if (status === "PRESENT") return { satisfied: false, resolved: true, reason: null };
        return { satisfied: false, resolved: false, reason: "PARTICIPANT_STATUS_UNKNOWN" };
      }
      case "STATE": {
        const declared = declaredStates.get(node.stateId);
        if (!declared || declared.participantId !== node.participantId) {
          return { satisfied: false, resolved: false, reason: "UNDECLARED_STATE" };
        }
        const status = stateStatus[`${node.participantId}:${node.stateId}`];
        if (status === "SATISFIED") return { satisfied: true, resolved: true, reason: null };
        if (status === "UNSATISFIED") return { satisfied: false, resolved: true, reason: null };
        return { satisfied: false, resolved: false, reason: "STATE_STATUS_UNKNOWN" };
      }
      default:
        return { satisfied: false, resolved: false, reason: "UNKNOWN_NODE_TYPE" };
    }
  };

  return evaluate(expr);
}

/* ── negative-rule cross-check: canonical-reference normalization ────────────────────────── */

/**
 * Item 7: HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY uses conceptual names
 * ("fiveForms", "fivePhases") that predate the connector graph's canonical
 * IDs ("fiveElements", the "five-phases" relatedSystemId). This is the one
 * finite normalization layer between them — it does not change what any rule
 * MEANS, only what string a participant ref is compared against. Refs with no
 * canonical graph counterpart ("faceShape", "measurementBinding") are left as
 * literals on purpose: they describe things this graph has no node for (a
 * MODERN classifier, a synthetic "no binding may exist" sentinel), so they
 * correctly never match any real participant.
 */
const NEGATIVE_RULE_REF_ALIASES = Object.freeze({
  fiveForms: "fiveElements",
  fivePhases: "five-phases",
});
export const canonicalRef = (ref) => NEGATIVE_RULE_REF_ALIASES[ref] ?? ref;

/**
 * Rule types genuinely about whether two nodes may coexist in a connector at
 * all — as opposed to FORBID_RUNTIME_BINDING, which bans a MODERN inference
 * FROM a relationship, not the historical relationship's existence. See the
 * doc comment on `negativeRuleViolations` below for why that distinction is
 * load-bearing and not just a filter of convenience.
 */
const PAIRWISE_COEXISTENCE_RULE_TYPES = Object.freeze([
  "FORBID_RELATIONSHIP_FAMILY",
  "FORBID_NODE_MAPPING",
  "TEXTUAL_ADJACENCY_ONLY",
]);

/**
 * `negativeRelationshipRegistry`-driven check: if a connector's participants
 * jointly cover both (canonicalised) `fromRef` and `toRef` of an ACTIVE rule
 * of one of the three PAIRWISE_COEXISTENCE_RULE_TYPES, the connector is
 * rejected outright — it may not exist as an eligible candidate at all.
 * FORBID_RUNTIME_BINDING rules are deliberately NOT matched by this function;
 * see `negativeRuleRuntimeBindingViolations` below for why that distinction
 * is load-bearing, not a filter of convenience. This also does not need to
 * cover the shen-unmeasurable rule: its `toRef` — "measurementBinding" — is
 * a sentinel with no participant counterpart and so can never be expressed
 * as a pairwise ref match; that rule is enforced by
 * `checkNegativeRelationshipInvariants` via `historicalStates` instead.
 */
export function negativeRuleViolations(connector, negativeRelationshipRegistry) {
  const refs = new Set((connector.participants || []).map((p) =>
    canonicalRef(p.conceptId ?? p.constructId ?? p.constituentId ?? p.relatedSystemId ?? p.participantId)));
  const violated = [];
  for (const rule of Object.values(negativeRelationshipRegistry || {})) {
    if (rule.status !== "ACTIVE") continue;
    if (!PAIRWISE_COEXISTENCE_RULE_TYPES.includes(rule.negativeRuleType)) continue;
    if (refs.has(canonicalRef(rule.fromRef)) && refs.has(canonicalRef(rule.toRef))) violated.push(rule.negativeRuleId);
  }
  return violated;
}

/**
 * Item 2 (Stage 2 review, round 3): FORBID_RUNTIME_BINDING is a narrower,
 * different claim from the three PAIRWISE_COEXISTENCE_RULE_TYPES above —
 * "this pairing must not become a live runtime binding" is not "these two
 * nodes may never coexist in a source-backed historical connector".
 * `no-qise-to-form-classification` (fromRef "heritageQiSe" -> canonical
 * "fiveElements") is the concrete case: a genuinely EXPLICITLY_ATTESTED
 * classical connector pairing heritageQiSe and fiveElements is ordinary
 * heritage material — structural co-presence in the connector's
 * `participants` is NOT, by itself, evidence that anyone is attempting the
 * forbidden modern binding, and must not block the connector on its own
 * (it may reach ACTIVE like any other connector, still
 * `prohibitedForUserInference: true` as always).
 *
 * What the rule actually forbids only exists when the CALLER explicitly
 * declares an attempted runtime binding via the injected
 * `runtimeBindingContext`:
 *
 *   runtimeBindingContext: { attemptedBindings: [{ fromRef, toRef }, ...] }
 *
 * — a finite, typed statement of intent ("something is asking whether
 * fromRef currently classifies/determines toRef"), never an inference this
 * function makes on its own.
 *
 * `shen-unmeasurable`'s toRef is "measurementBinding" — a governance
 * sentinel naming an abstract RUNTIME OPERATION ("acquire a measurement
 * binding"), not a heritage graph node. No connector could ever declare a
 * "measurementBinding" participant, so requiring it to appear as one (as
 * `fromRef` correctly must) would make this rule permanently unreachable.
 * RUNTIME_BINDING_SENTINEL_REFS names the finite set of toRefs exempt from
 * the structural-participant requirement; `fromRef` is NOT exempt — the
 * connector must still genuinely involve the heritage node the operation
 * would apply to (e.g. "shen").
 *
 * ── item 1 (Stage 2 review, round 5): the ATTEMPTED PAIRS THEMSELVES ARE
 * FINITE ──────────────────────────────────────────────────────────────────
 * `runtimeBindingContext` is not a free-text channel. Every fromRef/toRef a
 * caller may legitimately name is drawn from — and only from — the ACTIVE
 * FORBID_RUNTIME_BINDING rules already declared in the injected
 * negativeRelationshipRegistry, canonicalised through `canonicalRef`.
 * `validateRuntimeBindingContext` derives that finite vocabulary itself
 * (currently exactly `heritageQiSe->fiveElements` and
 * `shen->measurementBinding`, one per FORBID_RUNTIME_BINDING record) rather
 * than this module inventing a second, parallel rule language. An unknown
 * ref, an unrecognised pairing, or any shape other than the exact closed
 * `{ attemptedBindings: [{ fromRef, toRef }, ...] }` is REJECTED, not
 * coerced or partially accepted.
 */
const RUNTIME_BINDING_SENTINEL_REFS = Object.freeze(["measurementBinding"]);

function activeRuntimeBindingRules(negativeRelationshipRegistry) {
  return Object.values(negativeRelationshipRegistry || {})
    .filter((rule) => rule.status === "ACTIVE" && rule.negativeRuleType === "FORBID_RUNTIME_BINDING");
}

/**
 * The finite set of `${fromRef}->${toRef}` pairs (canonicalised) any
 * `attemptedBindings` entry may legitimately name — derived, not invented.
 */
function allowedBindingPairs(negativeRelationshipRegistry) {
  return new Set(activeRuntimeBindingRules(negativeRelationshipRegistry)
    .map((rule) => `${canonicalRef(rule.fromRef)}->${canonicalRef(rule.toRef)}`));
}

const isNonEmptyTrimmedString = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * Item 2/3 (Stage 2 review, round 5): validate `runtimeBindingContext` ONCE,
 * as a single closed-shape, closed-vocabulary contract — not per connector.
 * A genuinely absent context (`null`/`undefined`) is valid and means "no
 * runtime binding operation was requested". A well-formed
 * `{ attemptedBindings: [] }` is valid and means "no attempt". Anything else
 * must be EXACTLY `{ attemptedBindings: [{ fromRef, toRef }, ...] }` — no
 * extra top-level properties, no extra properties per entry, no non-string
 * or blank refs, and every canonicalised pair must be one of the finite
 * pairs `allowedBindingPairs` derives from the registry. ONE malformed or
 * unrecognised entry invalidates the WHOLE context — nothing is silently
 * stripped or partially honoured, per the caller having crossed a
 * governance-boundary contract rather than made an ordinary input mistake.
 *
 * Returns `{ valid: boolean, attemptedPairs: Set<string> }`; `attemptedPairs`
 * is always empty when `valid` is false.
 */
export function validateRuntimeBindingContext(runtimeBindingContext, negativeRelationshipRegistry) {
  if (runtimeBindingContext === null || runtimeBindingContext === undefined) {
    return { valid: true, attemptedPairs: new Set() };
  }
  if (typeof runtimeBindingContext !== "object" || Array.isArray(runtimeBindingContext)) {
    return { valid: false, attemptedPairs: new Set() };
  }
  const topLevelKeys = Object.keys(runtimeBindingContext);
  if (topLevelKeys.length !== 1 || topLevelKeys[0] !== "attemptedBindings") {
    return { valid: false, attemptedPairs: new Set() };
  }
  const rawBindings = runtimeBindingContext.attemptedBindings;
  if (!Array.isArray(rawBindings)) {
    return { valid: false, attemptedPairs: new Set() };
  }

  const recognisedPairs = allowedBindingPairs(negativeRelationshipRegistry);
  const attemptedPairs = new Set();
  for (const entry of rawBindings) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { valid: false, attemptedPairs: new Set() };
    }
    const entryKeys = Object.keys(entry);
    if (entryKeys.length !== 2 || !entryKeys.includes("fromRef") || !entryKeys.includes("toRef")) {
      return { valid: false, attemptedPairs: new Set() };
    }
    if (!isNonEmptyTrimmedString(entry.fromRef) || !isNonEmptyTrimmedString(entry.toRef)) {
      return { valid: false, attemptedPairs: new Set() };
    }
    const pair = `${canonicalRef(entry.fromRef)}->${canonicalRef(entry.toRef)}`;
    if (!recognisedPairs.has(pair)) {
      return { valid: false, attemptedPairs: new Set() };
    }
    attemptedPairs.add(pair);
  }
  return { valid: true, attemptedPairs };
}

/**
 * Which ACTIVE FORBID_RUNTIME_BINDING rules a connector actually violates,
 * given an already-validated set of canonicalised attempted pairs (from
 * `validateRuntimeBindingContext` — this function trusts its caller to have
 * validated the context ONCE, at resolution level; see item 3's doc comment
 * on `resolveHeritageConnections`). Structural co-presence alone (an empty
 * or non-matching `attemptedPairs`) never violates anything on its own.
 */
export function negativeRuleRuntimeBindingViolations(connector, negativeRelationshipRegistry, attemptedPairs) {
  const pairs = attemptedPairs instanceof Set ? attemptedPairs : new Set();
  if (pairs.size === 0) return [];
  const refs = new Set((connector.participants || []).map((p) =>
    canonicalRef(p.conceptId ?? p.constructId ?? p.constituentId ?? p.relatedSystemId ?? p.participantId)));

  const violated = [];
  for (const rule of activeRuntimeBindingRules(negativeRelationshipRegistry)) {
    const from = canonicalRef(rule.fromRef);
    const to = canonicalRef(rule.toRef);
    if (!refs.has(from)) continue; // the operation's SUBJECT must be structurally present
    if (!RUNTIME_BINDING_SENTINEL_REFS.includes(to) && !refs.has(to)) continue; // non-sentinel targets must be too
    if (!pairs.has(`${from}->${to}`)) continue;
    violated.push(rule.negativeRuleId);
  }
  return violated;
}

/* ── item 3: runtime PARTICIPANT availability — a third, independent axis ── */

/**
 * Item 1 (Stage 2 review, round 4): bounded, non-recursive-in-spirit
 * extraction of every participantId an AST actually tests, through exactly
 * the six declared node types. This is what lets the blanket participant
 * gate below defer to the AST ONLY for the participants the AST itself
 * owns — a connector with `conditionExpression: {type:"ABSENT",
 * participantId:"beta"}` and a THIRD declared participant "gamma" the AST
 * never mentions must still respect an explicit ABSENT/UNKNOWN on gamma; the
 * AST taking over beta's semantics does not hand it authority over
 * participants it says nothing about.
 */
export function referencedParticipantIds(expr) {
  const ids = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    switch (node.type) {
      case "ALL":
      case "ANY":
        for (const operand of node.operands || []) walk(operand);
        break;
      case "NOT":
        walk(node.operand);
        break;
      case "PRESENT":
      case "ABSENT":
      case "STATE":
        if (typeof node.participantId === "string" && node.participantId) ids.add(node.participantId);
        break;
      default:
        break;
    }
  };
  walk(expr);
  return ids;
}

const NO_REFERENCED_PARTICIPANTS = Object.freeze(new Set());

/**
 * Whether a connector's DECLARED participants are currently present, per
 * explicitly injected runtime evidence — completely independent of (a)
 * static `measurementAvailability` (can this ever be observed) and (b) any
 * `conditionExpression` (which only exists on some connectors, and which
 * OWNS the semantics for whichever participants it explicitly references —
 * see `referencedParticipantIds`). A participant NOT referenced by the
 * connector's own conditionExpression (including every participant on an
 * unconditional connector, which references none) still falls under this
 * blanket rule: the caller's explicit ABSENT/UNKNOWN must not be silently
 * ignored just because SOME OTHER participant happens to have its own AST
 * clause.
 *
 * Only EXPLICIT signals matter: a participant with no entry at all in
 * `conditionContext.participants` (or no conditionContext supplied) carries
 * no opinion and is not held against the connector — this is not the same
 * gap as "the caller said ABSENT/UNKNOWN". An ABSENT participant does NOT
 * mean the historical claim is false (a source can attest a relationship
 * whether or not its participant currently appears in front of the camera);
 * it means this particular resolution cannot present the relationship as
 * currently connected, so the connector is parked in unavailableRelations
 * with a distinct, honest reason.
 */
function resolveParticipantRuntimeGate(connector, conditionContext, referencedIds = NO_REFERENCED_PARTICIPANTS) {
  const statuses = conditionContext?.participants;
  if (!statuses) return { blocked: false, reason: null };
  let sawAbsent = false;
  let sawUnknown = false;
  for (const participant of connector.participants || []) {
    if (referencedIds.has(participant.participantId)) continue; // owned by the AST — see evaluateConditionExpression
    const status = statuses[participant.participantId];
    if (status === "ABSENT") sawAbsent = true;
    else if (status === "UNKNOWN") sawUnknown = true;
  }
  if (sawAbsent) return { blocked: true, reason: "PARTICIPANT_ABSENT" };
  if (sawUnknown) return { blocked: true, reason: "PARTICIPANT_UNKNOWN" };
  return { blocked: false, reason: null };
}

/* ── connector -> trace entry (never mutates the source connector) ───────── */

function toResolvedEntry(connector, { relationshipAvailability, conditionResolution, disposition, disagreementIds, gateReasons }) {
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
    gateReasons: gateReasons || [],
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
 *
 * `conditionContext` (see `evaluateConditionExpression`'s doc comment) and
 * `sourceRegistry` (see `resolveSourceEligibility`) are both optional; their
 * absence resolves conservatively (unresolved conditions, unknown sources),
 * never permissively.
 */
export function resolveHeritageConnections({
  heritageRegistry,
  conceptRegistry,
  connectorRegistry,
  disagreementRegistry,
  negativeRelationshipRegistry,
  compositionPolicies,
  sourceRegistry,
  readingState,
  conditionContext = null,
  runtimeBindingContext = null,
  rotationState = null,
  depthMode = "STANDARD",
  occurrence = 0,
} = {}) {
  const trace = [];
  const resolvedDepthMode = DEPTH_MODES.includes(depthMode) ? depthMode : "STANDARD";
  const resolvedOccurrence = Number.isFinite(occurrence) ? Math.max(0, occurrence | 0) : 0;

  // Item 3 (Stage 2 review, round 5): validate runtimeBindingContext ONCE,
  // before any candidate is even enumerated — not per connector. A caller
  // that supplies a malformed context has crossed a governance-boundary
  // contract, not made an ordinary per-connector input mistake, so the
  // WHOLE resolution fails closed: no activeConnectors, no sourcePanels, no
  // editorial presentation that could make the request look like it was
  // handled normally. A genuinely absent context, or a well-formed empty
  // `attemptedBindings`, both remain valid and mean "no attempt".
  const runtimeBindingValidation = validateRuntimeBindingContext(runtimeBindingContext, negativeRelationshipRegistry);
  if (!runtimeBindingValidation.valid) {
    return abstainedResult("INVALID_RUNTIME_BINDING_CONTEXT", resolvedDepthMode, resolvedOccurrence);
  }

  // 1-2. accept readingState, resolve primary construct.
  const requestedConstruct = readingState?.heritageConstruct;
  const primaryConstruct = requestedConstruct && heritageRegistry && heritageRegistry[requestedConstruct]
    ? requestedConstruct
    : null;
  if (!primaryConstruct) {
    return abstainedResult("UNKNOWN_HERITAGE_CONSTRUCT", resolvedDepthMode, resolvedOccurrence);
  }
  const constructRecord = heritageRegistry[primaryConstruct];

  // 3. resolve allowed lineage/source state. Documented fallback policy: the
  // requested lineage if it exists on this construct; otherwise "primary" if
  // present; otherwise the lexicographically-first declared lineage. Never a
  // lineage keyed to a DIFFERENT construct, and never a silent merge of two
  // lineages' data.
  const requestedLineage = readingState?.sourceLineage;
  const lineageKeys = Object.keys(constructRecord.lineages || {}).sort();
  const primaryLineage = requestedLineage && constructRecord.lineages?.[requestedLineage]
    ? requestedLineage
    : (constructRecord.lineages?.primary ? "primary" : (lineageKeys[0] || null));
  const lineageRecord = primaryLineage ? constructRecord.lineages[primaryLineage] : null;
  const lineageRestriction = resolveLineageRestriction(lineageRecord);
  trace.push({
    step: "resolvePrimaryLineage",
    outcome: primaryLineage === requestedLineage ? "requested" : "fell-back",
    primaryLineage,
    lineageRestriction,
  });

  const context = { heritageRegistry, conceptRegistry, primaryConstruct, primaryLineage };

  // 4. enumerate connector candidates involving the primary construct.
  // Sorted by connectorId FIRST — this is what makes the result independent
  // of the injected registry's own key/insertion order.
  const allConnectors = Object.values(connectorRegistry || {})
    .slice()
    .sort((a, b) => a.connectorId.localeCompare(b.connectorId));

  const constructCandidates = allConnectors.filter((connector) =>
    (connector.participants || []).some((p) => {
      if (p.nodeType !== "CONSTRUCT") return false;
      const refId = p.constructId ?? p.participantId;
      if (refId !== primaryConstruct) return false;
      return !p.lineageId || p.lineageId === primaryLineage;
    }));

  // Item 6: concept-only connectors (no CONSTRUCT participant at all — e.g.
  // shen-requires-form / form-requires-shen) have no construct to be a
  // candidate FOR. Rather than an arbitrary transitive graph walk, they
  // become candidates only when the caller EXPLICITLY anchors at least one of
  // their heritage-concept participants as PRESENT via conditionContext —
  // a bounded, one-pass, no-recursion opt-in. Without that anchor they are a
  // deliberate resolver abstention: present in the graph, absent from daily
  // resolution, exactly option C for the case nobody opts into option A.
  const anchoredParticipants = conditionContext?.participants || {};
  const conceptOnlyCandidates = allConnectors.filter((connector) => {
    if (!isConceptOnlyConnector(connector)) return false;
    return connector.participants.some((p) => p.nodeType === "HERITAGE_CONCEPT" && anchoredParticipants[p.participantId] === "PRESENT");
  });

  const candidateIds = new Set();
  const candidates = [];
  for (const connector of [...constructCandidates, ...conceptOnlyCandidates]) {
    if (candidateIds.has(connector.connectorId)) continue;
    candidateIds.add(connector.connectorId);
    candidates.push(connector);
  }
  candidates.sort((a, b) => a.connectorId.localeCompare(b.connectorId));

  const active = [];
  const unavailable = [];
  const sourcePanels = [];

  for (const connector of candidates) {
    // Item 3 (Stage 2 review, round 4): the SELECTED primary lineage may
    // gate a connector only when that connector is actually scoped to the
    // primary construct. A concept-only connector (shen-requires-form etc.)
    // is anchored independently of primaryConstruct/primaryLineage — an
    // unrelated construct's lineage strength/restriction must not leak into
    // its eligibility merely because it happened to be the construct the
    // caller was resolving when the concept was anchored. `undefined` (as
    // opposed to `null`) signals "not applicable" to lineageSourceStrength.
    const conceptOnly = isConceptOnlyConnector(connector);
    const applicableLineageRecord = conceptOnly ? undefined : lineageRecord;
    const applicableLineageRestriction = conceptOnly ? "NONE" : lineageRestriction;

    const relationshipAvailability = classifyRelationshipAvailability(connector, context, applicableLineageRestriction);

    // 5. reject any connector blocked by an ABSOLUTE co-existence ban or the
    // Stage 1 safety lock. FORBID_RUNTIME_BINDING is a SEPARATE, narrower
    // check (requires an explicit attempt — see negativeRuleRuntimeBindingViolations)
    // evaluated immediately below this block, not folded in here.
    const negativeErrors = [];
    checkNegativeRelationshipInvariants(connector, negativeErrors);
    const dataDrivenViolations = negativeRuleViolations(connector, negativeRelationshipRegistry);
    const blockedByNegativeRule = negativeErrors.length > 0 || dataDrivenViolations.length > 0;
    const lockOk = connector.prohibitedForUserInference === true;

    // 8. attach first-class disagreements (CONSTRUCT/CONNECTOR/LINEAGE
    // targets; see collectDisagreementIds). Computed early so every
    // disposition branch below can carry it.
    const disagreementIds = collectDisagreementIds({
      connector, primaryConstruct, primaryLineage, disagreementRegistry,
    });

    if (blockedByNegativeRule || !lockOk) {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution: { satisfied: false, resolved: true, reason: "NEGATIVE_RULE_BLOCKED" }, disagreementIds,
        disposition: "BLOCKED_NEGATIVE_RULE",
        gateReasons: [...negativeErrors, ...dataDrivenViolations, ...(lockOk ? [] : ["PROHIBITED_FOR_USER_INFERENCE_UNSET"])],
      }));
      continue;
    }

    // Item 4/2 (round 4 correction): an ATTEMPTED FORBID_RUNTIME_BINDING is
    // checked here, immediately after the absolute co-existence bans — NOT
    // as the last gate before ACTIVE. An explicit attempt is itself an
    // absolute safety veto (the same severity as blockedByNegativeRule
    // above, just narrower-triggering): it must be reported precisely as
    // BLOCKED_RUNTIME_BINDING regardless of whether the connector would ALSO
    // have been blocked for an unrelated reason further down (e.g. its own
    // RESEARCH_ONLY policy) — masking a real attempted-binding violation
    // behind an incidental RESEARCH_ONLY disposition would hide the one
    // signal callers most need to see. Structural co-presence alone (no
    // attempt) still never triggers this — see
    // negativeRuleRuntimeBindingViolations's doc comment. The context itself
    // was already validated ONCE, above, before the loop — an invalid
    // context never reaches here at all (see item 3, round 5).
    const runtimeBindingViolations = negativeRuleRuntimeBindingViolations(
      connector, negativeRelationshipRegistry, runtimeBindingValidation.attemptedPairs);
    if (runtimeBindingViolations.length > 0) {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution: { satisfied: false, resolved: true, reason: "RUNTIME_BINDING_BLOCKED" }, disagreementIds,
        disposition: "BLOCKED_RUNTIME_BINDING",
        gateReasons: runtimeBindingViolations,
      }));
      continue;
    }

    // Item 3 (Stage 2 review) / item 1 (round 4 correction): runtime
    // PARTICIPANT availability is a third, independent axis, but it must not
    // PRE-EMPT an explicit AST whose own semantics deliberately test for
    // absence (a conditionExpression of `{type:"ABSENT", participantId:"beta"}`
    // is satisfied BY beta being absent). The AST only takes over semantics
    // for the participants it ACTUALLY REFERENCES (referencedParticipantIds)
    // — a third declared participant the AST never mentions still falls
    // under the blanket rule below: an explicit ABSENT/UNKNOWN runtime
    // signal on it is never silently ignored just because some OTHER
    // participant happens to have its own AST clause.
    const referencedIds = referencedParticipantIds(connector.conditionExpression);
    const participantGate = resolveParticipantRuntimeGate(connector, conditionContext, referencedIds);
    if (participantGate.blocked) {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution: { satisfied: false, resolved: true, reason: participantGate.reason }, disagreementIds,
        disposition: "PARTICIPANT_UNAVAILABLE",
        gateReasons: [participantGate.reason],
      }));
      continue;
    }

    // 6-7. bounded conditionExpression, evaluated against the same runtime
    // evidence.
    const conditionResolution = evaluateConditionExpression(connector.conditionExpression, connector, conditionContext);
    if (!conditionResolution.resolved || !conditionResolution.satisfied) {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution, disagreementIds,
        disposition: "CONDITION_UNMET",
        gateReasons: [conditionResolution.reason].filter(Boolean),
      }));
      continue;
    }

    // Item 1/4: source/lineage eligibility, reconciled conservatively (see
    // resolveSourceEligibility). This can veto an otherwise-eligible
    // connector even when connector.runtimePolicy alone would have allowed
    // active presentation.
    const sourceEligibility = resolveSourceEligibility(connector, applicableLineageRecord, sourceRegistry);
    if (sourceEligibility === "UNKNOWN_SOURCE") {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution, disagreementIds,
        disposition: "UNKNOWN_SOURCE", gateReasons: ["UNKNOWN_SOURCE"],
      }));
      continue;
    }
    if (sourceEligibility === "BLOCKED") {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution, disagreementIds,
        disposition: "SOURCE_INELIGIBLE", gateReasons: ["SOURCE_NOT_ELIGIBLE"],
      }));
      continue;
    }
    if (applicableLineageRestriction === "ABSTAIN") {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution, disagreementIds,
        disposition: "LINEAGE_ABSTAINED", gateReasons: ["LINEAGE_ABSTAINED"],
      }));
      continue;
    }

    // Item 2: RESEARCH_ONLY (connector- or lineage-level) is checked BEFORE
    // any SOURCE_PANEL promotion. A RESEARCH_ONLY connector — or one whose
    // selected lineage is RESEARCH_ONLY — must never be promoted into
    // sourcePanels merely because its source citation happens to look solid
    // enough on its own (SOURCE_PANEL_CEILING); RESEARCH_ONLY is the more
    // restrictive disposition and wins regardless of source strength.
    if (connector.runtimePolicy === "RESEARCH_ONLY") {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution, disagreementIds,
        disposition: "RESEARCH_ONLY", gateReasons: ["RUNTIME_POLICY_RESEARCH_ONLY"],
      }));
      continue;
    }
    if (applicableLineageRestriction === "RESEARCH_ONLY") {
      unavailable.push(toResolvedEntry(connector, {
        relationshipAvailability, conditionResolution, disagreementIds,
        disposition: "LINEAGE_RESEARCH_ONLY", gateReasons: ["LINEAGE_RESEARCH_ONLY"],
      }));
      continue;
    }

    if (connector.runtimePolicy === "SOURCE_PANEL_ONLY" || sourceEligibility === "SOURCE_PANEL_CEILING") {
      // Policy (SOURCE_PANEL_ONLY) is checked FIRST in both ternaries below,
      // not the source-strength ceiling — a connector that is explicitly
      // policy-restricted to a source panel stays reported as such even when
      // its evidence ALSO happens to be weak; the two are different reasons
      // and the more absolute one (policy) wins the label.
      const isPolicyRestricted = connector.runtimePolicy === "SOURCE_PANEL_ONLY";
      sourcePanels.push(toResolvedEntry(connector, {
        relationshipAvailability: isPolicyRestricted ? "SOURCE_ONLY" : relationshipAvailability,
        conditionResolution, disagreementIds,
        disposition: isPolicyRestricted ? "SOURCE_PANEL" : "SOURCE_PANEL_CEILING",
        gateReasons: isPolicyRestricted ? [] : ["SOURCE_PANEL_CEILING"],
      }));
      continue;
    }

    // runtimePolicy === "HERITAGE_PRESENTATION_ALLOWED", source eligible,
    // lineage not restrictive beyond the HERITAGE_ONLY ceiling already folded
    // into relationshipAvailability above, no runtime-binding ban.
    active.push(toResolvedEntry(connector, {
      relationshipAvailability, conditionResolution, disagreementIds,
      disposition: "ACTIVE", gateReasons: [],
    }));
  }

  // Item 9: SOURCE_PANEL_ONLY material is withheld until SOURCE_DEEP. This
  // must be computed BEFORE disagreementPanels/editorialJuxtapositions below
  // (item 4, Stage 2 review round 3) — both used to be built from the FULL,
  // depth-unfiltered `sourcePanels`, which could leak a hidden connector's
  // existence at STANDARD/SUMMARY: a CONNECTOR-targeted disagreement about it
  // would still render, and its ID could still appear inside an editorial
  // juxtaposition's `items`, even though the connector itself never appears
  // anywhere in the visible output at that depth.
  const surfacedSourcePanels = resolvedDepthMode === "SOURCE_DEEP" ? sourcePanels : [];

  // 9. construct/connector/lineage-level disagreement panels. Recomputed
  // directly from the registry (not from the per-connector `disagreementIds`
  // already attached to each entry above) so CONSTRUCT/LINEAGE-level
  // disagreements — which are genuinely about the visible construct, not
  // about any one connector — never depend on whether a candidate connector
  // happened to exist to carry them, and so CONNECTOR-level disagreements
  // can be filtered to only the connectors actually visible at this depth.
  const lineageKey = `${primaryConstruct}:${primaryLineage}`;
  const visibleConnectorIds = new Set([...active, ...unavailable, ...surfacedSourcePanels].map((e) => e.connectorId));
  const disagreementPanels = Object.values(disagreementRegistry || {})
    .filter((d) => {
      const t = d.target;
      if (!t) return false;
      if (t.targetType === "CONSTRUCT") return t.targetRef === primaryConstruct;
      if (t.targetType === "LINEAGE") return t.targetRef === lineageKey;
      if (t.targetType === "CONNECTOR") return visibleConnectorIds.has(t.targetRef);
      return false;
    })
    .slice()
    .sort((a, b) => a.disagreementId.localeCompare(b.disagreementId))
    .map((d) => Object.freeze({ ...d, positions: d.positions || [] }));

  // The rotation SEED deliberately excludes occurrence — see
  // rotateDeterministically's doc comment.
  const rotationSeed = `heritageConstruct=${primaryConstruct}|sourceLineage=${primaryLineage}|depthMode=${resolvedDepthMode}`;
  const connectorSelectionKey = `${rotationSeed}|occurrence=${resolvedOccurrence}`;

  // 10. optionally select eligible editorial juxtaposition. Depth-gated: a
  // SUMMARY presentation never juxtaposes. Candidate IDs are drawn from the
  // depth-filtered `surfacedSourcePanels`, never the raw `sourcePanels` — a
  // juxtaposition rendered at STANDARD must never list a connector ID that
  // is not itself visible anywhere else in the STANDARD output.
  const editorialJuxtapositions = resolvedDepthMode === "SUMMARY"
    ? []
    : selectEditorialJuxtapositions({
      compositionPolicies,
      candidateIds: dedupeSortedIds([...active, ...surfacedSourcePanels].map((e) => e.connectorId)),
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
  for (const id of [...relationshipOrder, ...surfacedSourcePanels.map((e) => e.connectorId)]) {
    wordingVariantIndices[id] = seededIndex(`${connectorSelectionKey}|${id}|wording`, WORDING_MODULUS);
  }

  const componentSlots = [
    ...relationshipOrder.map((id) => ({ id, kind: "connector" })),
    ...surfacedSourcePanels.map((e) => ({ id: e.connectorId, kind: "sourcePanel" })),
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
    sourcePanels: Object.freeze(surfacedSourcePanels),
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
 * Item 8: disagreements attached to a candidate connector. Supports
 * CONSTRUCT (targeting the primary construct), CONNECTOR (targeting this
 * specific connectorId) and LINEAGE (targeting `${constructId}:${lineageId}`
 * — a composite key, since a bare lineageId like "primary" is reused across
 * constructs and would otherwise collide; this composite form is a Stage 2
 * convention, since no LINEAGE-targeted disagreement exists yet in Stage 1
 * data to have established one). Plus any the connector explicitly
 * references via its own `disagreementIds`. Never harmonizes — every
 * position on an OPEN/PARALLEL disagreement is kept, and no relevance is
 * invented for a target type/ref this connector does not actually match.
 */
function collectDisagreementIds({ connector, primaryConstruct, primaryLineage, disagreementRegistry }) {
  const explicit = connector.disagreementIds || [];
  const lineageKey = `${primaryConstruct}:${primaryLineage}`;
  const matched = Object.values(disagreementRegistry || {})
    .filter((d) => {
      const t = d.target;
      if (!t) return false;
      if (t.targetType === "CONSTRUCT") return t.targetRef === primaryConstruct;
      if (t.targetType === "CONNECTOR") return t.targetRef === connector.connectorId;
      if (t.targetType === "LINEAGE") return t.targetRef === lineageKey;
      return false;
    })
    .map((d) => d.disagreementId);
  return dedupeSortedIds([...explicit, ...matched]);
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
    const [registryMod, negativeMod, policyMod, conceptMod, provenanceMod] = await Promise.all([
      import("./registry.js"),
      import("./negative-relationships-registry.js"),
      import("./composition-policies-registry.js"),
      import("./concepts.js"),
      import("../reading/provenance.js"),
    ]);
    cachedDefaults = {
      heritageRegistry: registryMod.HERITAGE_REGISTRY,
      connectorRegistry: registryMod.HERITAGE_CONNECTOR_REGISTRY,
      disagreementRegistry: registryMod.HERITAGE_DISAGREEMENT_REGISTRY,
      negativeRelationshipRegistry: negativeMod.HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
      compositionPolicies: policyMod.HERITAGE_COMPOSITION_POLICIES,
      conceptRegistry: conceptMod.HERITAGE_CONCEPT_REGISTRY,
      sourceRegistry: provenanceMod.SOURCE_REGISTRY,
    };
  }
  return resolveHeritageConnections({ ...cachedDefaults, ...args });
}
