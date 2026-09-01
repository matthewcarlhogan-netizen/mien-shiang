/*
 * D-2 — WHY THE HERITAGE CONNECTOR CONTRIBUTED EXACTLY ONE STATE, AND WHAT
 * CHANGED UNDER DR-2026-08-31-D2-CONNECTOR-PREDICATE.
 *
 * ── THE ORIGINAL FINDING ────────────────────────────────────────────────────
 * `connectorResidue()` returned 1 for every construct because
 * `composeLatent(...).active` was 0 or 1 everywhere. The cause was a
 * conjunction of two INDEPENDENT gates that turned out to be anti-correlated
 * across the corpus:
 *
 *   - `active` admission requires `runtimePolicy === HERITAGE_PRESENTATION_ALLOWED`
 *     (resolver.js:1050/1065/1084 divert everything else).
 *   - `classifyRelationshipAvailability()` grades a connector measurable only
 *     when the connector, every participant construct-lineage, and every
 *     historicalState all classify as `capturable`.
 *
 * Measured over the 15 connector records at the time, the cross-tabulation's
 * diagonal was EMPTY: no connector was both measurable and authorised.
 *
 * ── WHAT DR-2026-08-31-D2-CONNECTOR-PREDICATE CHANGED ──────────────────────
 * D2-1/D2-2 promoted `three-sections-facial-proportion-taiqing` to
 * `HERITAGE_PRESENTATION_ALLOWED`, and `ABSTRACT_LINEAGE_OVERRIDES` (added to
 * `composition.js` under the same decision) routes threeSections' abstract
 * "primary" request to the VERIFIED `taiqing-mianbu-facial` lineage instead
 * of the contested received-Ma-Yi lineage — see
 * docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md §6 for the full trace.
 * This is now ONE genuine cell on the diagonal, not zero — the tests below
 * are updated accordingly, together with that evidence and that decision, as
 * this file's own discipline requires.
 *
 * ── WHY THIS IS A TEST AND NOT ONLY A DOCUMENT ─────────────────────────────
 * CLAUDE.md's Verification Protocol §9: a constraint without a failing test to
 * protect it will be tidied away. The specific tidy-up this guards against is
 * someone raising Gate D by flipping a `runtimePolicy` or relaxing a
 * `measurementAvailability` — which would move the number without adding a
 * single genuine relationship, and would do it in a one-line diff that reads
 * as a configuration change.
 *
 * These tests are DESCRIPTIVE, not prescriptive. They record what the corpus
 * is today. Legitimately adding a source-attested relationship, or a
 * product-owner promotion decision (see docs/HERITAGE_CONNECTOR_RELATIONSHIP_
 * CONTRACT.md sections 3 and 5), SHOULD fail them — at which point the right
 * response is to update the recorded counts together with the evidence and the
 * decision that authorised it, never to loosen the assertion on its own. This
 * file's own history is now the proof: exactly that happened once already.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HERITAGE_REGISTRY, HERITAGE_CONNECTOR_REGISTRY, HERITAGE_DISAGREEMENT_REGISTRY,
} from "../../src/heritage/registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "../../src/heritage/concepts.js";
import { HERITAGE_CONSTRUCT_IDS } from "../../src/heritage/constants.js";
import { composeLatent, connectorResidue } from "../../scripts/heritage-readiness.mjs";

const CONNECTORS = Object.entries(HERITAGE_CONNECTOR_REGISTRY);

/*
 * A local re-derivation of resolver.js's measurement classification. It is
 * deliberately a SEPARATE implementation rather than an import: if the
 * resolver's own classifier changed, importing it would make this test agree
 * with the change automatically and the finding would evaporate silently. The
 * paired test below asserts this re-derivation still agrees with the real
 * composition, which is what keeps the duplication honest.
 */
const MEASUREMENT_CLASS = Object.freeze({
  SUPPORTED_2D: "capturable", CONDITIONALLY_SUPPORTED: "capturable",
  CAMERA_GEOMETRY_INSUFFICIENT: "practical", UNSUPPORTED: "practical",
  MODERN_MAPPING_UNSUPPORTED: "practical",
  UNMEASURABLE: "categorical", PERMANENTLY_ABSTAIN: "categorical",
  NOT_RECORDED: "unknown",
});

function relationshipAvailabilityOf(connector) {
  const signals = [connector.measurementAvailability];
  for (const participant of connector.participants || []) {
    if (participant.nodeType === "HERITAGE_CONCEPT") {
      const concept = HERITAGE_CONCEPT_REGISTRY[participant.conceptId ?? participant.participantId];
      signals.push(concept ? concept.measurementAvailability : "NOT_RECORDED");
    } else if (participant.nodeType === "CONSTRUCT") {
      const record = HERITAGE_REGISTRY[participant.constructId ?? participant.participantId];
      const lineage = record?.lineages?.primary;
      signals.push(lineage ? lineage.measurementAvailability : "NOT_RECORDED");
    } else {
      signals.push("NOT_RECORDED");
    }
  }
  for (const state of connector.historicalStates || []) signals.push(state.measurementAvailability);

  const classes = new Set(signals.map((v) => MEASUREMENT_CLASS[v] || "unknown"));
  if (classes.size === 1 && classes.has("capturable")) return "FULLY_AVAILABLE";
  if (classes.has("capturable")) return "PARTIALLY_AVAILABLE";
  return connector.runtimePolicy === "HERITAGE_PRESENTATION_ALLOWED"
    ? "HERITAGE_ONLY" : "UNAVAILABLE_FROM_CAPTURE";
}

const MEASURABLE = new Set(["FULLY_AVAILABLE", "PARTIALLY_AVAILABLE"]);

/* ── the finding itself ──────────────────────────────────────────────────── */

test("exactly one connector is now both measurable and authorised, and it is the decided one", () => {
  const both = CONNECTORS.filter(([, c]) =>
    c.runtimePolicy === "HERITAGE_PRESENTATION_ALLOWED"
    && MEASURABLE.has(relationshipAvailabilityOf(c)));

  assert.deepEqual(both.map(([id]) => id), ["three-sections-facial-proportion-taiqing"],
    "the set of connectors both measurable and authorised changed -- if this is a new, "
    + "genuine, decided promotion, update docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md "
    + "section 1 and docs/DECISION_REGISTER.md together with this assertion. Do NOT delete "
    + "this assertion to make the suite pass.");
});

test("the corpus cross-tabulation is what the contract records", () => {
  const cells = {};
  for (const [, c] of CONNECTORS) {
    const key = `${relationshipAvailabilityOf(c)}|${c.runtimePolicy}`;
    cells[key] = (cells[key] || 0) + 1;
  }
  assert.deepEqual(cells, {
    // DR-2026-08-31-D2-CONNECTOR-PREDICATE moved
    // three-sections-facial-proportion-taiqing from the FULLY_AVAILABLE|
    // RESEARCH_ONLY cell (was 2) into its own new cell below (was 0), and its
    // measured relationshipAvailability moved from FULLY_AVAILABLE to
    // HERITAGE_ONLY -- the connector's own participant/measurement signals
    // are unchanged; what changed is the SELECTED LINEAGE's restriction
    // (ABSTRACT_LINEAGE_OVERRIDES routes threeSections/primary to the
    // HERITAGE_ONLY taiqing-mianbu-facial lineage), which
    // classifyRelationshipAvailability() folds in as a ceiling. See contract
    // §6 for the full trace.
    "FULLY_AVAILABLE|RESEARCH_ONLY": 1,
    "PARTIALLY_AVAILABLE|SOURCE_PANEL_ONLY": 1,
    "HERITAGE_ONLY|HERITAGE_PRESENTATION_ALLOWED": 3,
    "UNAVAILABLE_FROM_CAPTURE|RESEARCH_ONLY": 9,
    "FULLY_AVAILABLE|HERITAGE_PRESENTATION_ALLOWED": 1,
  }, "the connector corpus changed shape; re-measure and update the contract document");
  assert.equal(CONNECTORS.length, 15, "no connector record was added or removed by this decision");
});

test("two connectors are active anywhere in the product, and both are named", () => {
  const active = [];
  for (const heritageConstruct of HERITAGE_CONSTRUCT_IDS) {
    for (const sourceLineage of ["primary", "variant"]) {
      const composed = composeLatent({
        heritageConstruct, sourceLineage, depthMode: "SOURCE_DEEP", occurrence: 0,
      });
      for (const entry of composed?.active || []) {
        active.push(`${heritageConstruct}/${sourceLineage}:${entry.connectorId}`);
      }
    }
  }
  assert.deepEqual(active.sort(), [
    "fourRivers/primary:four-rivers-flow-and-banks",
    "threeSections/primary:three-sections-facial-proportion-taiqing",
  ], "the set of active connectors changed");
});

/*
 * The paired positive control for the re-derivation above. Without it, the
 * local classifier could drift away from the resolver's and these tests would
 * keep passing while describing a library that no longer exists.
 */
test("the local availability re-derivation still agrees with the real composition", () => {
  // four-rivers-flow-and-banks is HERITAGE_ONLY by the local classifier, and
  // the real composition admits exactly it and nothing else -- so the two
  // implementations agree on the one case that decides the whole result.
  const flow = HERITAGE_CONNECTOR_REGISTRY["four-rivers-flow-and-banks"];
  assert.equal(relationshipAvailabilityOf(flow), "HERITAGE_ONLY");
  assert.equal(flow.runtimePolicy, "HERITAGE_PRESENTATION_ALLOWED");

  const composed = composeLatent({
    heritageConstruct: "fourRivers", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  assert.equal(composed.active.length, 1);
  assert.equal(composed.active[0].connectorId, "four-rivers-flow-and-banks");
});

/* ── the second gate: lineage runtimeStatus ─────────────────────────────── */

test("fiveMountains' two authorised connectors are still blocked by lineage routing, not by policy", () => {
  // CARD 7 remains untouched by DR-2026-08-31-D2-CONNECTOR-PREDICATE:
  // ABSTRACT_LINEAGE_OVERRIDES has exactly one entry now (threeSections),
  // and fiveMountains' "primary" still has no approved routing of its own.
  // Its two HERITAGE_PRESENTATION_ALLOWED connectors are still blocked by
  // something OTHER than their own policy -- which is why fiveMountains'
  // residue is still 1, unaffected by this decision.
  const allowed = CONNECTORS
    .filter(([, c]) => c.runtimePolicy === "HERITAGE_PRESENTATION_ALLOWED")
    .map(([id]) => id).sort();
  assert.deepEqual(allowed, [
    "five-mountains-fullness", "five-mountains-mutual-facing", "four-rivers-flow-and-banks",
    "three-sections-facial-proportion-taiqing",
  ].sort());

  assert.equal(HERITAGE_REGISTRY.fiveMountains.lineages.primary.runtimeStatus, "RESEARCH_ONLY",
    "fiveMountains/primary became routable; CARD 7 has moved and the contract needs updating");
  assert.equal(HERITAGE_REGISTRY.fourRivers.lineages.primary.runtimeStatus, "RUNTIME_PROSE");
  // The received Ma Yi threeSections lineage -- the literal "primary" key --
  // stays exactly where D2-1/D2-2 require it: untouched, never promoted.
  // Its OWN passage-rendering path (heritageMaterialFor()) never consults
  // ABSTRACT_LINEAGE_OVERRIDES (see composition.js's comment on the override
  // and contract §6.1), so this is the fact that keeps the passage abstained.
  assert.equal(HERITAGE_REGISTRY.threeSections.lineages.primary.runtimeStatus, "RESEARCH_ONLY",
    "the contested Ma Yi threeSections/primary lineage must never be promoted");

  const mountains = composeLatent({
    heritageConstruct: "fiveMountains", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  assert.equal((mountains.active || []).length, 0,
    "fiveMountains admitted a connector while its lineage is still RESEARCH_ONLY");
});

/* ── the residue, measured through the harness ──────────────────────────── */

test("connector residue is 1 for every construct, for want of candidates", () => {
  for (const heritageConstruct of HERITAGE_CONSTRUCT_IDS) {
    const { residue, activeCount, derivedFrom } = connectorResidue(heritageConstruct, "primary");
    assert.equal(residue, 1, `${heritageConstruct} residue moved to ${residue}`);
    assert.ok(activeCount <= 1, `${heritageConstruct} has ${activeCount} active connectors`);
    assert.match(derivedFrom, /single-or-zero-candidate/,
      `${heritageConstruct}'s residue of 1 now comes from a rotation period rather than from `
      + "having nothing to rotate -- that is a genuine change, re-measure the contract");
  }
});

/* ── the expansion the corpus already supports ──────────────────────────── */

test("the three-sections predicate disagreement carries two byte-pinned positions", () => {
  /*
   * Contract section 2: this is the strongest legitimate candidate for
   * connector depth in the corpus and needs no new source acquisition. 相稱
   * ("in proportion") and 平等 ("equal") are DIFFERENT geometric predicates
   * about the one construct whose geometry is SUPPORTED_2D. Pinned so the
   * positions cannot be quietly merged into a single house reading -- which
   * would destroy the only real relationship depth available.
   */
  const d = HERITAGE_DISAGREEMENT_REGISTRY["three-sections-predicate"];
  assert.ok(d, "the three-sections predicate disagreement is gone");
  assert.equal(d.nature, "PREDICATE");
  assert.equal(d.status, "OPEN", "the disagreement was resolved; that is a product decision");
  assert.deepEqual(d.positions.map((p) => p.positionId).sort(),
    ["taiqing-xiangcheng", "yuguan-pingdeng"]);

  // And threeSections really is the one construct a flat photograph can measure.
  assert.equal(HERITAGE_REGISTRY.threeSections.lineages.primary.measurementAvailability,
    "SUPPORTED_2D");
  const capturable = HERITAGE_CONSTRUCT_IDS.filter((id) =>
    MEASUREMENT_CLASS[HERITAGE_REGISTRY[id]?.lineages?.primary?.measurementAvailability] === "capturable");
  assert.deepEqual(capturable.sort(), ["fiveOfficers", "threeSections", "twelvePalaces"],
    "the set of constructs measurable from a flat photograph changed");
});

test("both measurable connectors carry a fortune predicate the product may not state", () => {
  // Contract C9 / section 1's third constraint. The relationships this product
  // CAN measure are precisely the ones whose classical predicates it is
  // forbidden to render. Pinned because it is the least obvious of the three
  // constraints and the one most likely to be lost.
  const taiqing = HERITAGE_CONNECTOR_REGISTRY["three-sections-facial-proportion-taiqing"];
  const officers = HERITAGE_CONNECTOR_REGISTRY["five-officers-one-good-office-ten-years"];
  assert.match(taiqing.sourceText, /上相/, "the 上相 rank clause is gone from the source text");
  assert.match(officers.sourceText, /貴/, "the 貴 rank clause is gone from the source text");

  // Neither may be user-inferred, whatever else changes about them.
  for (const [id, c] of CONNECTORS) {
    assert.equal(c.prohibitedForUserInference, true,
      `${id} dropped prohibitedForUserInference; resolver.js:941 requires it`);
  }
});
