/*
 * REQUIRED_HERITAGE_SCOPE — an analytical artefact, not a runtime dependency.
 *
 * Lives under scripts/heritage-readiness/, not src/, on purpose (per this
 * program's B2 requirement): nothing in the shipped product needs this
 * denominator. It exists so the readiness harness's coverage denominator is
 * fixed by the product's approved contracts, not by whatever happens to be
 * reachable today — which closes the loophole where deleting a weak
 * construct would improve the score. If a future product surface needs the
 * same scope, that is a separate, deliberate promotion into src/, not a
 * side effect of this file existing.
 *
 * The six ids are exactly `HERITAGE_CONSTRUCT_IDS` from src/heritage/constants.js
 * (frozen, Stage 1) — the "six enduring constructs" named in
 * docs/PROJECT_CHARTER.md's 17 August 2026 amendment: Three Sections 三停,
 * Five Elements 五形人, Twelve Palaces 十二宮, Five Mountains 五岳,
 * Four Rivers 四瀆, Five Officers 五官. This file does not redeclare that
 * list from memory — it imports it, so the two can never silently diverge.
 */

import { HERITAGE_CONSTRUCT_IDS } from "../../src/heritage/constants.js";

/**
 * The six coverage classes a required construct may sit in. Never averaged,
 * never dropped from the denominator — the readiness harness reports every
 * one of these six ids in every run, whatever its classification.
 */
export const COVERAGE_CLASSES = Object.freeze([
  "RUNTIME_SUPPORTED",
  "LEGITIMATE_PERMANENT_ABSTENTION",
  "APPROVED_HERITAGE_ONLY",
  "COVERAGE_GAP",
  "DECISION_BLOCKED",
  "ARCHITECTURE_BLOCKED",
]);

/**
 * Classification, derived from the REAL computed HERITAGE_REGISTRY this
 * session (`node --input-type=module` queries against the actual registry,
 * not from reading source literals) — see
 * docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md for the exact query
 * and docs/HERITAGE_LIBRARY_READINESS.md for the narrative. Each entry names
 * the class, the reason, and — where the class is DECISION_BLOCKED — the
 * exact decision card that would move it, so a future run of this file is
 * not guessing why a construct sits where it does.
 */
export const REQUIRED_HERITAGE_SCOPE = Object.freeze({
  threeSections: Object.freeze({
    constructId: "threeSections",
    canonicalChineseName: "三停",
    class: "COVERAGE_GAP",
    reason: "No lineage under this construct has runtimeStatus RUNTIME_PROSE — verified against "
      + "HERITAGE_REGISTRY.threeSections this session. Evidence is genuinely strong (taiqing-section-heading, "
      + "taiqing-mianbu-facial and yuguan-pingdeng are all VERIFIED_PRIMARY after the 2026-08-29 project-owned "
      + "reconciliation), but no reader-facing base narrative has been written for it, unlike fiveElements/"
      + "fourRivers/fiveOfficers. This is unbuilt work, not a withheld decision or a permanent abstention.",
    blockedByDecisionCard: null,
    notes: "The 卷六 BODY construct (taiqing-section-heading) carries its own permanent field-level "
      + "abstention: measurementAvailability UNSUPPORTED, because a face-only scanner cannot measure body "
      + "proportions. That is a legitimate sub-claim abstention, tracked here as a note, not as the "
      + "construct's own classification — the FACIAL lineage (taiqing-mianbu-facial) is SUPPORTED_2D.",
  }),
  fiveElements: Object.freeze({
    constructId: "fiveElements",
    canonicalChineseName: "五形",
    class: "RUNTIME_SUPPORTED",
    reason: "The primary lineage has runtimeStatus RUNTIME_PROSE and evidenceStrength VERIFIED_PRIMARY — "
      + "verified against HERITAGE_REGISTRY.fiveElements this session. The base construct renders through "
      + "the Reflection Engine's heritage rotation today (subject to the public/internal reflectionMode "
      + "split — see docs/RETENTION_EXPERIENCE_CONTRACT.md's B4 analyses).",
    blockedByDecisionCard: null,
    notes: "The construct's DISCLOSURE content is partially decision-blocked: whether the 25-type "
      + "medical-parallel framing should be corrected (docs/DECISION_CARDS.md CARD 8, SUPERSEDE R7?). "
      + "This blocks a content correction, not the construct's runtime reachability, which is why the "
      + "top-level class here is RUNTIME_SUPPORTED rather than DECISION_BLOCKED.",
  }),
  twelvePalaces: Object.freeze({
    constructId: "twelvePalaces",
    canonicalChineseName: "十二宮",
    class: "DECISION_BLOCKED",
    reason: "No lineage under this construct has runtimeStatus RUNTIME_PROSE. taiqing-yuguan is "
      + "HERITAGE_ONLY despite being VERIFIED_PRIMARY (byte-pinned this session, matrix EV-13) — "
      + "deliberately held below RUNTIME_PROSE pending a product-owner decision on the construct's "
      + "overall runtime status, because an open disagreement (twelve-palaces-constituents) sits "
      + "alongside the strong evidence and promoting one without addressing the other would misstate "
      + "how settled the construct is.",
    blockedByDecisionCard: "CARD 10",
    notes: null,
  }),
  fiveMountains: Object.freeze({
    constructId: "fiveMountains",
    canonicalChineseName: "五岳",
    class: "DECISION_BLOCKED",
    reason: "No lineage under this construct has runtimeStatus RUNTIME_PROSE. taiqing-siku is "
      + "HERITAGE_ONLY despite VERIFIED_PRIMARY connectors now byte-pinned onto it (this session's "
      + "five-mountains-mutual-facing / five-mountains-fullness split) — deliberately held because the "
      + "construct's abstract \"primary\" rotation label has no product-owner-approved routing to a named "
      + "witness (ABSTRACT_LINEAGE_OVERRIDES is deliberately empty).",
    blockedByDecisionCard: "CARD 7",
    notes: "A future unlock (multi-witness presentation of the 頥/頷/頦 disagreement) is recorded as an "
      + "architecture backlog item (research option E) in CARD 7, not as a current ARCHITECTURE_BLOCKED "
      + "classification — nothing today needs that architecture to render what evidence already supports.",
  }),
  fourRivers: Object.freeze({
    constructId: "fourRivers",
    canonicalChineseName: "四瀆",
    class: "RUNTIME_SUPPORTED",
    reason: "The primary lineage has runtimeStatus RUNTIME_PROSE and evidenceStrength VERIFIED_PRIMARY — "
      + "verified against HERITAGE_REGISTRY.fourRivers this session. Its connector-graph (Stage 3) layer "
      + "additionally reached a new, real reachability milestone this session: four-rivers-flow-and-banks "
      + "is now genuinely ACTIVE-eligible under the real production fourRivers/primary lineage (not "
      + "blocked by a routing decision the way fiveMountains is), pending only the safety-authorization "
      + "gate (CARD 6) that gates every construct's connector layer equally. See "
      + "docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md's \"Downstream reachability\" section.",
    blockedByDecisionCard: null,
    notes: null,
  }),
  fiveOfficers: Object.freeze({
    constructId: "fiveOfficers",
    canonicalChineseName: "五官",
    class: "RUNTIME_SUPPORTED",
    reason: "The primary lineage has runtimeStatus RUNTIME_PROSE and evidenceStrength VERIFIED_PRIMARY — "
      + "verified against HERITAGE_REGISTRY.fiveOfficers this session.",
    blockedByDecisionCard: null,
    notes: "five-officers-one-good-office-ten-years is deliberately held at a fixed SOURCE_PANEL_ONLY "
      + "runtimePolicy regardless of its own evidence strength (now VERIFIED_PRIMARY) — fortune-typed "
      + "content is never promoted to an active user-facing connector. This is APPROVED_HERITAGE_ONLY "
      + "at the connector level, tracked here as a note because the construct's base RUNTIME_PROSE "
      + "narrative is unaffected by it.",
  }),
});

/** Sanity: the scope covers exactly the frozen six ids, in the same order, always. */
export function assertScopeMatchesCanonicalConstructs() {
  const scopeIds = Object.keys(REQUIRED_HERITAGE_SCOPE);
  const canonical = [...HERITAGE_CONSTRUCT_IDS];
  const mismatch = scopeIds.length !== canonical.length
    || scopeIds.some((id, i) => id !== canonical[i]);
  if (mismatch) {
    throw new Error(
      "REQUIRED_HERITAGE_SCOPE has drifted from HERITAGE_CONSTRUCT_IDS: "
      + `scope=[${scopeIds.join(",")}] canonical=[${canonical.join(",")}]`,
    );
  }
  return true;
}

/** One-line summary per class, for the readiness report. */
export function summariseCoverage(scope = REQUIRED_HERITAGE_SCOPE) {
  const byClass = Object.fromEntries(COVERAGE_CLASSES.map((c) => [c, []]));
  for (const entry of Object.values(scope)) {
    byClass[entry.class].push(entry.constructId);
  }
  return byClass;
}
