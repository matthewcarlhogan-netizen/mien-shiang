/*
 * scripts/heritage-readiness.mjs — material-signature correctness.
 *
 * A "material" signature exists to absorb PRESENTATION noise a raw
 * byte-for-byte comparison would wrongly count as a difference (key order,
 * whitespace). It must never be MORE fine-grained than raw — raw is the
 * ground truth of what a reader can perceive at that tier, so a material
 * signature that distinguishes states raw does not is proof it is leaking
 * internal state the reader never sees, not evidence of richer content.
 *
 * This suite pins the fix for a confirmed defect: `baseMaterialSignature`
 * used to be built from `composed.trace` (which spans every layer — Tier 1's
 * observation/magnitude, Tier 3's history/confidence, Tier 2's own
 * heritage/bridge/reflection all interleaved, src/qise/reflection.js:281-352)
 * rather than from the Tier-2 object a reader actually sees
 * (`readingTiers().tier2`). Measured before the fix: fiveElements/primary
 * reported baseReadingRawDistinct=9 against baseReadingMaterialDistinct=648
 * — material 72x finer than raw, i.e. the internal 648-state selector
 * odometer relabelled as "material distinctness of the reading".
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  stableStringify,
  baseMaterialSignature,
  heritageTier2MaterialSignature,
  heritageTier3MaterialSignature,
  canonicalRegistries,
  composeLatent,
} from "../../scripts/heritage-readiness.mjs";
import { REQUIRED_HERITAGE_SCOPE } from "../../scripts/heritage-readiness/required-scope.mjs";
import { enumerateReachableStates } from "../../src/qise/reading-state.js";
import { composeReading, variationCycle } from "../../src/qise/reflection.js";
import { readingTiers } from "../../src/qise/reading-tiers.js";
import { deriveTier2FromComposition } from "../../src/qise/heritage-connections.js";
import { tier2ConnectorModel, tier3ConnectorModel } from "../../src/ui/qise/heritage-view.js";
import { SOURCE_REGISTRY } from "../../src/reading/provenance.js";

/* ── importing the harness module must not run it ────────────────────────── */

test("importing scripts/heritage-readiness.mjs as a module does not execute main() or exit", () => {
  // If the entrypoint guard were absent or wrong, importing this module from
  // this test file would have already called process.exit() before this
  // test body ever ran — so simply reaching this assertion is the proof.
  assert.equal(typeof canonicalRegistries, "object");
  assert.equal(typeof composeLatent, "function");
});

/* ── stableStringify: canonicalises KEY ORDER only, never content ───────── */

test("stableStringify is invariant to key order but sensitive to content", () => {
  const a = { z: 1, a: 2, nested: { y: "p", x: "q" } };
  const b = { a: 2, z: 1, nested: { x: "q", y: "p" } };
  const c = { a: 2, z: 1, nested: { x: "different", y: "p" } };
  assert.equal(stableStringify(a), stableStringify(b));
  assert.notEqual(stableStringify(a), stableStringify(c));
  // And it is genuinely different from plain JSON.stringify on the
  // reordered pair — otherwise this "canonicalisation" would be a no-op.
  assert.notEqual(JSON.stringify(a), JSON.stringify(b));
});

/* ── the real fixture: one required construct's full prose period ───────── */

function walkConstruct(constructId) {
  const reachable = enumerateReachableStates();
  const state = reachable.find((s) => s.heritageConstruct === constructId && s.sourceLineage === "primary")
    ?? reachable.find((s) => s.heritageConstruct === constructId);
  assert.ok(state, `no reachable state for ${constructId} — fixture problem, not a content finding`);
  const period = variationCycle(state);
  const rows = [];
  for (let occurrence = 0; occurrence < period; occurrence++) {
    const composed = composeReading(state, { occurrence, includeSelfReport: false });
    const tier2 = readingTiers({ state, composed }).tier2;
    rows.push({
      occurrence,
      raw: JSON.stringify(tier2),
      material: baseMaterialSignature(tier2),
    });
  }
  return rows;
}

test("base-reading material signature never distinguishes what raw does not (fiveElements)", () => {
  const rows = walkConstruct("fiveElements");
  const byRaw = new Map();
  for (const r of rows) {
    if (!byRaw.has(r.raw)) byRaw.set(r.raw, []);
    byRaw.get(r.raw).push(r);
  }

  // Precondition: the corpus actually has hidden-selector variation behind an
  // identical visible Tier 2 output — otherwise this test would pass
  // vacuously without ever exercising the property it claims to check.
  const multiOccurrenceGroups = [...byRaw.values()].filter((g) => g.length > 1);
  assert.ok(multiOccurrenceGroups.length > 0,
    "fixture expectation failed: no raw-identical group found across the full prose period — "
    + "the corpus may have changed shape; this test needs re-deriving, not silently skipping");

  // FALSIFICATION 1 — hidden selector change, identical visible Tier 2:
  // every occurrence sharing one raw output must share one material signature.
  for (const group of multiOccurrenceGroups) {
    const materials = new Set(group.map((r) => r.material));
    assert.equal(materials.size, 1,
      `occurrences ${group.map((r) => r.occurrence).join(",")} render identical Tier 2 output `
      + "but produced different material signatures — the material signature is leaking a "
      + "hidden (non-Tier-2-visible) selector");
  }

  // FALSIFICATION 2 — visible Tier 2 component change: a genuinely different
  // raw output must produce a genuinely different material signature. Since
  // baseMaterialSignature canonicalises only key order (never content) for a
  // plain data object, raw-distinct and material-distinct counts must match
  // exactly — this is the headline regression guard for the fix.
  const distinctRaw = byRaw.size;
  const distinctMaterial = new Set(rows.map((r) => r.material)).size;
  assert.equal(distinctMaterial, distinctRaw,
    "material signature must be exactly as fine-grained as raw for the base reading, "
    + "never finer (leaking hidden state) and never coarser than genuine content differences");
});

/* ── Tier 2 vs Tier 3 heritage material signatures are independently scoped ── */

test("a Tier-3-only field change does not move the Tier 2 heritage material signature", () => {
  const tier2ModelA = { available: true, reason: null, card: { connectorId: "same-connector" } };
  const tier2ModelB = { available: true, reason: null, card: { connectorId: "same-connector" } };
  const tier3ModelA = {
    active: [{ connectorId: "same-connector" }],
    sourcePanelOnly: [],
    disagreements: [],
    abstentions: [],
    editorial: [],
  };
  const tier3ModelB = {
    active: [{ connectorId: "same-connector" }],
    // A Tier-3-only surface (the source panel) changes; Tier 2's own bounded
    // view does not reference it at all.
    sourcePanelOnly: [{ connectorId: "extra-panel-only-witness" }],
    disagreements: [],
    abstentions: [],
    editorial: [],
  };

  assert.equal(
    heritageTier2MaterialSignature(tier2ModelA),
    heritageTier2MaterialSignature(tier2ModelB),
    "Tier 2 material signature must be blind to a Tier-3-only field",
  );
  assert.notEqual(
    heritageTier3MaterialSignature(tier3ModelA),
    heritageTier3MaterialSignature(tier3ModelB),
    "Tier 3 material signature must still see the change Tier 2 correctly ignores",
  );
});

test("a Tier-2-visible connector change moves the Tier 2 heritage material signature", () => {
  const tier2ModelA = {
    available: true, reason: null,
    card: { connectorId: "connector-a", relationshipLabel: "corresponds to", participants: [{ label: "A" }], sourceTitle: "Source A" },
  };
  const tier2ModelB = {
    available: true, reason: null,
    card: { connectorId: "connector-b", relationshipLabel: "corresponds to", participants: [{ label: "B" }], sourceTitle: "Source B" },
  };
  assert.notEqual(
    heritageTier2MaterialSignature(tier2ModelA),
    heritageTier2MaterialSignature(tier2ModelB),
  );
});

/* ── real end-to-end sanity: the exported reducers this file's caller uses ── */

test("real Tier 2/Tier 3 connector models for a required construct produce well-formed material signatures", () => {
  const constructId = "fiveElements";
  const scope = REQUIRED_HERITAGE_SCOPE[constructId];
  assert.ok(scope, "fiveElements must be a required construct");

  const result = composeLatent({ heritageConstruct: constructId, sourceLineage: "primary", depthMode: "SOURCE_DEEP", occurrence: 0 });
  const tier2Connectors = deriveTier2FromComposition(result);
  const tier2Model = tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY);
  const tier3Model = tier3ConnectorModel(result, SOURCE_REGISTRY);

  const t2 = heritageTier2MaterialSignature(tier2Model);
  const t3 = heritageTier3MaterialSignature(tier3Model);
  assert.equal(typeof t2, "string");
  assert.equal(typeof t3, "string");
  // The two signatures answer different questions about different surfaces;
  // nothing requires them to differ or agree, only that each is well-formed
  // and independently derived (proven above with synthetic models).
});
