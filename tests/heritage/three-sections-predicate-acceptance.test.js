/*
 * D-2 IMPLEMENTATION — DR-2026-08-31-D2-CONNECTOR-PREDICATE.
 *
 * ── WHAT WAS ACTUALLY IMPLEMENTED, IN ONE SENTENCE ─────────────────────────
 * `three-sections-facial-proportion-taiqing` (the VERIFIED Taiqing facial
 * connector) is now active; the contested received-Ma-Yi
 * `threeSections/primary` lineage is untouched, still `RESEARCH_ONLY`, never
 * the source of an active passage; `relationshipPredicate` and
 * `excludedPredicateClauses` reach the reader-facing card layer through a
 * bounded resolver.js pass-through and two independent guards
 * (`englishSafe()`, `fortuneFree()`); no translation was invented, so the
 * card's `predicate` field is honestly `null` today. Full trace in
 * docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md §6.
 *
 * ── WHY THIS IS ONE CONNECTOR, NOT TWO ──────────────────────────────────────
 * The corrected D2-3 scope (two records: update Taiqing in place, add
 * exactly one new Yuguan/平等 record) is NOT completed in this pass — the
 * owner's instruction for this round asked for exactly one verified Taiqing
 * connector, activated, with the field-flow proven end to end. Splitting the
 * `three-sections-predicate` disagreement into two connectors remains future
 * work under the same decision. `AUTHORISED_ACTIVE_TAIQING_ID` names the one
 * connector this pass activates; nothing here asserts a second exists.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  HERITAGE_REGISTRY, HERITAGE_CONNECTOR_REGISTRY, HERITAGE_DISAGREEMENT_REGISTRY,
} from "../../src/heritage/registry.js";
import { HERITAGE_CONSTRUCT_IDS } from "../../src/heritage/constants.js";
import {
  tier2ConnectorModel, tier3ConnectorModel,
  heritageConnectorTier2Markup, heritageConnectorTier3Markup,
  connectorCard, fortuneFree,
} from "../../src/ui/qise/heritage-view.js";
import { deriveTier2FromComposition } from "../../src/qise/heritage-connections.js";
import { readingTiers } from "../../src/qise/reading-tiers.js";
import { enumerateReachableStates } from "../../src/qise/reading-state.js";
import { composeReading } from "../../src/qise/reflection.js";
import { heritageMaterialFor } from "../../src/qise/reflection.js";
import { composeLatent, connectorResidue, DIVERSITY_TARGET } from "../../scripts/heritage-readiness.mjs";

const AUTHORISED_ACTIVE_TAIQING_ID = "three-sections-facial-proportion-taiqing";
const MA_YI_CONNECTOR_ID = "three-sections-equality-mayi-received";
const FORBIDDEN_DUPLICATE_IDS = ["three-sections-xiangcheng-taiqing", "three-sections-pingdeng-yuguan"];

/* ── #10, #11: identity, and no duplicate record ─────────────────────────── */

test("no duplicate or second Taiqing/Yuguan connector was created", () => {
  for (const id of FORBIDDEN_DUPLICATE_IDS) {
    assert.equal(HERITAGE_CONNECTOR_REGISTRY[id], undefined,
      `${id} exists; this pass activates exactly one existing connector, never a duplicate`);
  }
  const taiqingSources = Object.values(HERITAGE_CONNECTOR_REGISTRY)
    .filter((c) => c.sourceId === "heritage-three-sections-taiqing-mianbu");
  assert.equal(taiqingSources.length, 1, "more than one connector now cites the Taiqing mianbu source");
});

test("connector identity, source identity and relationship identity are distinct fields", () => {
  const c = HERITAGE_CONNECTOR_REGISTRY[AUTHORISED_ACTIVE_TAIQING_ID];
  assert.ok(c, "the activated connector is gone");
  assert.equal(c.connectorId, AUTHORISED_ACTIVE_TAIQING_ID);
  assert.equal(c.sourceId, "heritage-three-sections-taiqing-mianbu");
  assert.equal(c.relationshipType, "COLLECTIVE_RULE");
  // Three genuinely different axes -- none is derived from another.
  assert.notEqual(c.connectorId, c.sourceId);
  assert.notEqual(c.connectorId, c.relationshipType);
});

/* ── #7: the Taiqing active path, gated correctly ────────────────────────── */

test("the Taiqing connector is active for threeSections/primary, via the routed lineage", () => {
  const composed = composeLatent({
    heritageConstruct: "threeSections", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  assert.equal(composed.primaryLineage, "taiqing-mianbu-facial",
    "ABSTRACT_LINEAGE_OVERRIDES.threeSections.primary is missing or changed");
  const activeIds = (composed.active || []).map((e) => e.connectorId);
  assert.deepEqual(activeIds, [AUTHORISED_ACTIVE_TAIQING_ID]);
  assert.equal(composed.active[0].relationshipAvailability, "HERITAGE_ONLY",
    "the connector must present as attributed tradition, never as observed in this capture");
  assert.equal(composed.active[0].disposition, "ACTIVE");
});

test("the connector reached active only because of the decided lineage route, not a policy change alone", () => {
  // Negative half: WITHOUT the lineage override, the same connector policy
  // promotion is not sufficient -- the lineage-level RESEARCH_ONLY gate
  // (resolver.js's LINEAGE_RESEARCH_ONLY disposition) still blocks it. This
  // is what proves the override is load-bearing, not decorative.
  const literalMaYiLineage = HERITAGE_REGISTRY.threeSections.lineages.primary;
  assert.equal(literalMaYiLineage.runtimeStatus, "RESEARCH_ONLY",
    "if this changed, the negative half of this test no longer holds");
});

/* ── #6: Ma Yi stays source-panel-only / never active ────────────────────── */

test("the Ma Yi connector and lineage are untouched, and never reach active or the passage", () => {
  const mayi = HERITAGE_CONNECTOR_REGISTRY[MA_YI_CONNECTOR_ID];
  assert.equal(mayi.runtimePolicy, "RESEARCH_ONLY",
    "the contested Ma Yi connector must not be promoted without its own, separate, explicit decision");
  assert.equal(HERITAGE_REGISTRY.threeSections.lineages.primary.runtimeStatus, "RESEARCH_ONLY",
    "the contested Ma Yi lineage -- the literal 'primary' key -- must never be promoted to RUNTIME_PROSE");

  const composed = composeLatent({
    heritageConstruct: "threeSections", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const activeIds = (composed.active || []).map((e) => e.connectorId);
  const sourcePanelIds = (composed.sourcePanelOnly || []).map((e) => e.connectorId);
  assert.ok(!activeIds.includes(MA_YI_CONNECTOR_ID), "the Ma Yi connector reached active");
  assert.ok(!sourcePanelIds.includes(MA_YI_CONNECTOR_ID),
    "the Ma Yi connector reached the source panel; that would need its own separate, explicit "
    + "provenance/attribution/wording review per DR-2026-08-31 D2-1's conditional clause, not "
    + "taken here");
});

test("the passage layer (heritageMaterialFor) is untouched and still abstains for threeSections/primary", () => {
  // heritageMaterialFor() does its own direct lineages[sourceLineage] lookup
  // and has never consulted ABSTRACT_LINEAGE_OVERRIDES -- see composition.js's
  // comment on the override and contract §6.1. This proves that fact rather
  // than merely asserting it: the material must still be the abstained
  // review-copy placeholder, never the Ma Yi "auspicious" passage and never
  // the Taiqing lineage's own (unsafe, Han-laden) definition text.
  const state = {
    heritageConstruct: "threeSections", sourceLineage: "primary", ascendant: "chi",
  };
  const material = heritageMaterialFor(state);
  assert.equal(material.abstained, true,
    "threeSections/primary's passage stopped abstaining -- this must stay untouched by D2-1/D2-2");
  assert.doesNotMatch(material.passage, /auspicious/i);
  assert.doesNotMatch(material.passage, /[㐀-鿿]/, "the passage rendered raw Han script");
});

/* ── #1, #2, #3: field flow, from connector record to rendered markup ────── */

test("relationshipPredicate and excludedPredicateClauses survive resolver.js's pass-through", () => {
  const composed = composeLatent({
    heritageConstruct: "threeSections", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const entry = composed.active[0];
  assert.equal(entry.relationshipPredicate, "相稱");
  assert.deepEqual(entry.excludedPredicateClauses, ["上相"]);
});

test("the card layer consumes relationshipPredicate through two independent guards, not as unused metadata", () => {
  const composed = composeLatent({
    heritageConstruct: "threeSections", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const entry = composed.active[0];
  const card = connectorCard(entry);
  assert.ok(card, "connectorCard returned nothing for the active entry");
  // Today: Han-only predicate, no translation authorised -> null, honestly.
  assert.equal(card.predicate, null,
    "no translation exists; the card must not render the raw Han predicate");

  // Prove the field is CONSUMED, not merely present: feeding connectorCard a
  // SAFE, already-English-safe synthetic predicate must make it through, and
  // an UNSAFE one (matching the connector's own excludedPredicateClauses, or
  // claim-shaped English) must not. This is what tells "wired but nothing to
  // show today" apart from "dead code that would silently fail to render
  // even a valid future translation".
  const safeSynthetic = connectorCard({ ...entry, relationshipPredicate: "in proportion" });
  assert.equal(safeSynthetic.predicate, "in proportion");

  const excludedSynthetic = connectorCard({ ...entry, relationshipPredicate: "上相 interpretation" });
  assert.equal(excludedSynthetic.predicate, null, "Han must still be rejected on a synthetic value");

  const claimSynthetic = connectorCard({
    ...entry, relationshipPredicate: "a person of superior physiognomy",
  });
  assert.equal(claimSynthetic.predicate, null,
    "claim-shaped English must be rejected even with no Han present");
});

test("the rendered Tier 2 and Tier 3 markup honestly omits the predicate today (no translation exists)", () => {
  const composed = composeLatent({
    heritageConstruct: "threeSections", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const t2Model = tier2ConnectorModel(deriveTier2FromComposition(composed));
  const t3Model = tier3ConnectorModel(composed);

  assert.equal(t2Model.card.predicate, null);
  assert.doesNotMatch(heritageConnectorTier2Markup(t2Model), /相稱|上相/);
  assert.doesNotMatch(heritageConnectorTier3Markup(t3Model), /相稱|上相/);
});

/* ── #2/#3 continued: the markup function itself, directly ──────────────── */

test("heritageConnectorCardMarkup renders a safe predicate and omits an absent one", async () => {
  const { heritageConnectorCardMarkup } = await import("../../src/ui/qise/heritage-view.js");
  const baseCard = {
    connectorId: "x", relationshipLabel: "collective rule", participants: [],
    sourceId: "s", sourceTitle: null, sectionLocator: null,
    disposition: "ACTIVE", prohibitedForUserInference: true, predicate: null,
  };
  assert.doesNotMatch(heritageConnectorCardMarkup(baseCard), /<p class="muted">null<\/p>/);
  const withPredicate = heritageConnectorCardMarkup({ ...baseCard, predicate: "in proportion" });
  assert.match(withPredicate, /in proportion/);
});

/* ── #3, #4, #5: no claim reaches any surface; Han rejection; refusal control ── */

const FORBIDDEN_HAN = /[上]相|貴|富貴|壽/;

test("fortuneFree rejects Han, rejects claim-shaped English, passes safe text, and passes refusal copy", () => {
  // Han (defence in depth -- englishSafe() already removes it upstream in
  // connectorCard(), but fortuneFree() must not be the thing relying on that).
  assert.equal(fortuneFree("三停皆稱乃上相之人矣"), "三停皆稱乃上相之人矣",
    "fortuneFree alone does not reject Han; englishSafe() upstream is what does -- "
    + "this documents the division of labour rather than asserting a false guarantee");
  assert.match("三停皆稱乃上相之人矣", FORBIDDEN_HAN);
  assert.match("或一官好則貴十年", FORBIDDEN_HAN);

  // Claim-shaped English, rejected.
  for (const claim of [
    "this is a person of superior physiognomy",
    "the classical reading is one of high office",
    "associated with wealth and long life",
    "a noble configuration",
    "this reading is auspicious",
    "brings good fortune to the household",
  ]) {
    assert.equal(fortuneFree(claim), null, `should reject: ${claim}`);
  }

  // Safe geometric text, passed through.
  for (const safe of [
    "the three sections are in proportion to one another",
    "the sections stand equal in length",
    "sources differ on whether the reading is proportion or equality",
  ]) {
    assert.equal(fortuneFree(safe), safe, `should pass: ${safe}`);
  }

  // The refusal-copy negative control: real shipped copy that NAMES the
  // category in order to refuse it. Found live during this work -- the first
  // draft of this guard banned the bare words "fortune"/"status"/"rank" and
  // rejected exactly this sentence.
  const refusal = "it remains fortune-typed heritage and is never encoded as a user inference";
  assert.equal(fortuneFree(refusal), refusal, "a refusal sentence naming the category must pass");

  // excludedPredicateClauses substring matching.
  assert.equal(fortuneFree("相稱, 上相", ["上相"]), null);
  assert.equal(fortuneFree("相稱", ["上相"]), "相稱");
});

test("no rank, status or fortune claim reaches any heritage reader surface, across all constructs and occurrences", () => {
  const offenders = [];
  for (const heritageConstruct of HERITAGE_CONSTRUCT_IDS) {
    for (const sourceLineage of ["primary", "variant"]) {
      for (const occurrence of [0, 1, 2, 3, 5, 8]) {
        const composed = composeLatent({
          heritageConstruct, sourceLineage, depthMode: "SOURCE_DEEP", occurrence,
        });
        if (!composed) continue;
        const t2Model = tier2ConnectorModel(deriveTier2FromComposition(composed));
        const t3Model = tier3ConnectorModel(composed);
        const texts = [
          heritageConnectorTier2Markup(t2Model),
          heritageConnectorTier3Markup(t3Model),
          JSON.stringify(t2Model),
          JSON.stringify(t3Model),
        ];
        for (const text of texts) {
          const han = text.match(FORBIDDEN_HAN);
          if (han) offenders.push(`${heritageConstruct}/${sourceLineage}@${occurrence}: Han "${han[0]}"`);
          if (/auspicious|superior physiognomy|high office|\bnoble\b|nobility|\bdestiny\b|\bfated\b|longevity|good fortune|fortunate|\bwealthy\b|prosperity|prosperous|high rank/i.test(text)
            && !text.includes("fortune-typed heritage")) {
            offenders.push(`${heritageConstruct}/${sourceLineage}@${occurrence}: claim-shaped English in "${text.slice(0, 200)}"`);
          }
        }
      }
    }
  }
  assert.deepEqual(offenders, [],
    "a rank/status/fortune claim reached a reader-facing heritage surface:\n  " + offenders.join("\n  "));
});

test("no rank, status or fortune claim reaches Tier 1, Tier 2 or Tier 3 of the base reading", () => {
  const offenders = [];
  for (const state of enumerateReachableStates().filter((_, i) => i % 23 === 0)) {
    const tiers = readingTiers({ state, composed: composeReading(state) });
    for (const [tier, value] of Object.entries(tiers)) {
      const text = JSON.stringify(value);
      if (FORBIDDEN_HAN.test(text)) offenders.push(`${tier}: Han match`);
      if (/superior physiognomy|high office|\bnoble\b|\bauspicious\b|\bdestiny\b|\bfated\b|longevity|good fortune|fortunate|\bwealthy\b|prosperity|prosperous|high rank/i.test(text)) {
        offenders.push(`${tier}: claim-shaped English`);
      }
    }
  }
  assert.deepEqual([...new Set(offenders)], []);
});

/* ── #9: Tier 2/Tier 3 separation, no source-panel leakage ───────────────── */

test("Tier 2 shows at most the one active connector; source-panel material never reaches Tier 2", () => {
  const composed = composeLatent({
    heritageConstruct: "threeSections", sourceLineage: "primary",
    depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const t2 = deriveTier2FromComposition(composed);
  assert.equal(t2.available, true);
  assert.equal(t2.connector.connectorId, AUTHORISED_ACTIVE_TAIQING_ID);
  // tier2ConnectorModel's shape structurally cannot carry sourcePanelOnly --
  // see its own docstring -- confirmed here rather than only trusted.
  const model = tier2ConnectorModel(t2);
  assert.ok(!("sourcePanelOnly" in model), "Tier 2's model gained a source-panel field");
});

/* ── #12, #13: the exhaustive harness, run honestly ───────────────────────── */

test("connector residue for threeSections stays 1 -- one active connector, nothing to rotate against", () => {
  const { residue, activeCount, derivedFrom } = connectorResidue("threeSections", "primary");
  assert.equal(residue, 1);
  assert.equal(activeCount, 1, "activeCount moved from 0 to 1, but residue correctly stays 1: one "
    + "candidate is still nothing to rotate between");
  assert.match(derivedFrom, /single-or-zero-candidate/);
});

test("Gate D's target is held at 250, and activating one connector does not and should not reach it", () => {
  assert.equal(DIVERSITY_TARGET, 250, "DR-2026-08-31 D2-4 holds Gate D at 250; do not relax it here");
  const best = Math.max(...HERITAGE_CONSTRUCT_IDS.map((id) => connectorResidue(id, "primary").activeCount));
  assert.ok(best < DIVERSITY_TARGET,
    "connector depth now claims to approach the diversity target; re-measure before believing it");
});

test("the predicate disagreement is recorded but this pass does not claim to have surfaced both positions", () => {
  // Evidence-level fact, unchanged by this pass: both positions are still
  // recorded in the disagreement registry. Whether they are BOTH visibly
  // reachable as active connectors is D2-3's remaining half, not claimed here.
  const d = HERITAGE_DISAGREEMENT_REGISTRY["three-sections-predicate"];
  assert.ok(d);
  assert.equal(d.status, "OPEN");
  assert.deepEqual(d.positions.map((p) => p.positionId).sort(),
    ["taiqing-xiangcheng", "yuguan-pingdeng"]);
});

/* ── #8: absent, malformed, disputed, research-only, source-panel-only ──── */

test("absent relationshipPredicate on an ordinary connector still resolves to a safe null, not a crash", () => {
  const c = HERITAGE_CONNECTOR_REGISTRY["four-rivers-flow-and-banks"];
  assert.equal(c.relationshipPredicate, null, "fixture assumption: this connector declares no predicate");
  const composed = composeLatent({
    heritageConstruct: "fourRivers", sourceLineage: "primary", depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const card = connectorCard(composed.active[0]);
  assert.equal(card.predicate, null);
});

test("a disputed, research-only connector (Ma Yi) never reaches a card at all", () => {
  const composed = composeLatent({
    heritageConstruct: "threeSections", sourceLineage: "primary", depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  const mayiInActive = (composed.active || []).find((e) => e.connectorId === MA_YI_CONNECTOR_ID);
  const mayiInPanel = (composed.sourcePanelOnly || []).find((e) => e.connectorId === MA_YI_CONNECTOR_ID);
  assert.equal(mayiInActive, undefined);
  assert.equal(mayiInPanel, undefined);
});

test("a source-panel-only connector (five-officers) is unaffected by this decision", () => {
  const composed = composeLatent({
    heritageConstruct: "fiveOfficers", sourceLineage: "primary", depthMode: "SOURCE_DEEP", occurrence: 0,
  });
  assert.equal((composed.active || []).length, 0);
  assert.equal((composed.sourcePanelOnly || []).length, 1);
});

/* ── #14: frozen files differ only in the one approved exception ─────────── */

test("resolver.js's diff from the pre-D-2 baseline is exactly the two pass-through fields", () => {
  const source = readFileSync(
    new URL("../../src/heritage/resolver.js", import.meta.url), "utf8");
  assert.match(source, /relationshipPredicate: connector\.relationshipPredicate \?\? null,/);
  assert.match(source, /excludedPredicateClauses: connector\.excludedPredicateClauses \|\| \[\],/);
  // Negative control: nothing else the exception explicitly disclaimed
  // (predicateTranslation, a new enum, a new branch in the gate logic) is
  // present.
  assert.doesNotMatch(source, /predicateTranslation/,
    "predicateTranslation was never approved; it must not appear in resolver.js");
});

test("connectors.js, schema.js and validator.js are untouched by this decision", () => {
  // excludedPredicateClauses is deliberately NOT declared in
  // HERITAGE_CONNECTOR_FIELDS -- see registry.js's comment on the connector
  // record and contract §6.5's "PROPOSED, NOT AUTHORISED" schema-exception
  // text. The owner approved a resolver.js exception only; this proves the
  // other three Stage 1 files were not touched to make room for it.
  for (const rel of ["connectors.js", "schema.js", "validator.js"]) {
    const source = readFileSync(new URL("../../src/heritage/" + rel, import.meta.url), "utf8");
    assert.doesNotMatch(source, /excludedPredicateClauses/,
      `${rel} was touched to accommodate excludedPredicateClauses; only resolver.js was approved`);
  }
});

/* ── determinism ──────────────────────────────────────────────────────────── */

test("the Taiqing connector's composition replays byte-identically for the same inputs", () => {
  for (const occurrence of [0, 1, 5, 12]) {
    const a = JSON.stringify(composeLatent({
      heritageConstruct: "threeSections", sourceLineage: "primary", depthMode: "SOURCE_DEEP", occurrence,
    }));
    const b = JSON.stringify(composeLatent({
      heritageConstruct: "threeSections", sourceLineage: "primary", depthMode: "SOURCE_DEEP", occurrence,
    }));
    assert.equal(a, b, `occurrence ${occurrence} did not replay identically`);
  }
});

test("no clock or random source was introduced in the files this decision touched", () => {
  const FORBIDDEN = /\bMath\.random\b|\bDate\.now\b|\bnew Date\b|\bperformance\.now\b/;
  for (const rel of [
    "resolver.js", "composition.js", "registry.js", "evidence.js",
  ]) {
    const source = readFileSync(new URL("../../src/heritage/" + rel, import.meta.url), "utf8");
    assert.doesNotMatch(source, FORBIDDEN, `${rel} introduced a clock or a random source`);
  }
  const view = readFileSync(
    new URL("../../src/ui/qise/heritage-view.js", import.meta.url), "utf8");
  assert.doesNotMatch(view, FORBIDDEN, "heritage-view.js introduced a clock or a random source");
});
