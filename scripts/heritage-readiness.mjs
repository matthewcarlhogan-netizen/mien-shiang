#!/usr/bin/env node
/*
 * HERITAGE READINESS / GOLD HARNESS.
 *
 * `npm run heritage:readiness`. Measures the heritage library's LATENT
 * capability — how deep the corpus is if every non-content authorisation
 * gate were hypothetically satisfied — against the required scope in
 * scripts/heritage-readiness/required-scope.mjs. This is an internal
 * analytical tool.
 *
 * ── THE INTERNAL SEAM, NOT THE PRODUCTION ENTRY POINT ───────────────────────
 * This harness calls `composeHeritageConnectionsWithRegistries()`, injecting
 * the canonical registry exports directly — NEVER `composeHeritageForReading()`,
 * which is the sole product-facing Stage 3 entry point. `src/ui/qise/app.js`
 * and `composeHeritageOnceForReading()` are not touched by this file, and
 * `safetyPassed`/`captureQualityPassed` are never set to `true` anywhere in
 * production as a result of this harness existing.
 *
 *     THIS EVALUATES LATENT LIBRARY CAPABILITY USING THE INTERNAL COMPOSITION
 *     SEAM. IT DOES NOT AUTHORIZE STAGE 3 PRODUCTION OUTPUT.
 *
 * Production safety authorisation is currently UNKNOWN/unset and remains
 * fail-closed until an explicit approved safety decision or implemented
 * authoritative signal changes that state (docs/DECISION_CARDS.md CARD 6).
 *
 * ── REUSES THE REAL PRODUCTION REDUCERS ─────────────────────────────────────
 * `deriveTier2FromComposition`, `tier2ConnectorModel`, `tier3ConnectorModel`,
 * `heritageConnectorTier2Markup`, `heritageConnectorTier3Markup` and
 * `readingTiers` are imported verbatim from src/. This harness does not
 * reimplement connector selection, disagreement filtering, source-panel
 * visibility, editorial presentation, Tier 2 bounding or Tier 3 ordering —
 * it certifies the experience the product actually renders, not a second
 * model that merely resembles it.
 *
 * ── NOT READY IS A VALID RESULT, EXIT 0 ─────────────────────────────────────
 * Only a genuine harness failure (crash, non-determinism, invalid state)
 * exits non-zero. A truthful "NOT READY" because the corpus is honestly not
 * deep enough yet is not a bug in this script.
 */

import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { HERITAGE_REGISTRY, HERITAGE_CONNECTOR_REGISTRY, HERITAGE_DISAGREEMENT_REGISTRY } from "../src/heritage/registry.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "../src/heritage/negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "../src/heritage/composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "../src/heritage/concepts.js";
import { HERITAGE_CONSTRUCT_IDS } from "../src/heritage/constants.js";
import { SOURCE_REGISTRY } from "../src/reading/provenance.js";
import { composeHeritageConnectionsWithRegistries } from "../src/heritage/composition.js";
import { deriveTier2FromComposition } from "../src/qise/heritage-connections.js";
import { tier2ConnectorModel, tier3ConnectorModel, heritageConnectorTier2Markup, heritageConnectorTier3Markup } from "../src/ui/qise/heritage-view.js";
import { enumerateReachableStates } from "../src/qise/reading-state.js";
import { composeReading, variationCycle } from "../src/qise/reflection.js";
import { readingTiers } from "../src/qise/reading-tiers.js";

import { REQUIRED_HERITAGE_SCOPE, COVERAGE_CLASSES, assertScopeMatchesCanonicalConstructs, summariseCoverage } from "./heritage-readiness/required-scope.mjs";

export const HARNESS_VERSION = "1.0.0";
export const DIVERSITY_TARGET = 250;
export const CONNECTOR_RESIDUE_WALK_BOUND = 64; // real corpus candidate counts are 0-2; generous margin
export const DIVERSITY_WALK_CAP = 2000; // exhaustive for periods at/under this; sampled lower-bound above it

function gitCommit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: fileURLToPath(new URL("..", import.meta.url)) }).toString().trim();
  } catch {
    return "UNKNOWN";
  }
}

export const canonicalRegistries = Object.freeze({
  heritageRegistry: HERITAGE_REGISTRY,
  connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
  disagreementRegistry: HERITAGE_DISAGREEMENT_REGISTRY,
  negativeRelationshipRegistry: HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
  conceptRegistry: HERITAGE_CONCEPT_REGISTRY,
  compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
  sourceRegistry: SOURCE_REGISTRY,
});

/** The internal seam call, with the LATENT authorisation this harness exists to evaluate. */
export function composeLatent({ heritageConstruct, sourceLineage, depthMode, occurrence }) {
  return composeHeritageConnectionsWithRegistries({
    ...canonicalRegistries,
    heritageConstruct,
    sourceLineage,
    depthMode,
    occurrence,
    // LATENT authorisation — hypothetical, internal-seam only. Never true in
    // any code path composeHeritageForReading()/app.js can reach.
    captureQualityPassed: true,
    safetyPassed: true,
  });
}

/* ── selector-residue derivation (never assumed) ─────────────────────────── */

/**
 * The connector-selection residue for one (construct, lineage): walk
 * occurrence and find the period of the ACTUAL Tier 2 top-pick sequence
 * (renderPlan.relationshipOrder[0], via deriveTier2FromComposition — the
 * same function Tier 2 itself calls). Returns 1 (identity) when there is
 * nothing to rotate (0 or 1 active connector) — the zero-connector case
 * this program requires never evaluate LCM(n, 0).
 */
export function connectorResidue(heritageConstruct, sourceLineage) {
  const zero = composeLatent({ heritageConstruct, sourceLineage, depthMode: "SOURCE_DEEP", occurrence: 0 });
  if (!zero || zero.suppressed || zero.abstained || (zero.active || []).length <= 1) {
    return { residue: 1, activeCount: zero ? (zero.active || []).length : 0, derivedFrom: "single-or-zero-candidate, nothing to rotate" };
  }
  const sequence = [];
  for (let occ = 0; occ < CONNECTOR_RESIDUE_WALK_BOUND; occ++) {
    const r = composeLatent({ heritageConstruct, sourceLineage, depthMode: "SOURCE_DEEP", occurrence: occ });
    const tier2 = deriveTier2FromComposition(r);
    sequence.push(tier2.connector ? tier2.connector.connectorId : null);
  }
  for (let period = 1; period <= CONNECTOR_RESIDUE_WALK_BOUND / 2; period++) {
    let matches = true;
    for (let i = 0; i + period < sequence.length; i++) {
      if (sequence[i] !== sequence[i + period]) { matches = false; break; }
    }
    if (matches) {
      return { residue: period, activeCount: (zero.active || []).length, derivedFrom: `walked ${CONNECTOR_RESIDUE_WALK_BOUND} occurrences, exact repeat found` };
    }
  }
  return { residue: null, activeCount: (zero.active || []).length, derivedFrom: `no repeat found within ${CONNECTOR_RESIDUE_WALK_BOUND} occurrences — UNRESOLVED` };
}

export function gcd(a, b) { return b ? gcd(b, a % b) : a; }
export function lcm(a, b) { return (a / gcd(a, b)) * b; }

/* ── material (structural) signatures — TIER-SCOPED, never leaking hidden state ──
 *
 * A material signature exists to absorb PRESENTATION noise (key order,
 * whitespace, DOM ids) that raw byte-for-byte comparison would wrongly count
 * as a difference. It must never be MORE fine-grained than raw, because raw
 * is the ground truth of what a reader can actually perceive at that tier —
 * a material signature that distinguishes more states than raw is proof the
 * function is leaking internal state the reader never sees, not evidence of
 * richer content.
 *
 * CONFIRMED DEFECT, fixed here: the previous `baseMaterialSignature` mapped
 * `composed.trace` directly. `composed.trace` spans EVERY layer (Tier 1's
 * observation/magnitude, Tier 3's history/confidence, Tier 2's
 * heritage/bridge/reflection — src/qise/reflection.js:281-352, each trace
 * entry carries a `layer` field precisely because they are not tier-uniform),
 * so it carries variant indices for components a Tier 2 reader never sees.
 * Measured before this fix: fiveElements/primary reported
 * baseReadingRawDistinct=9 against baseReadingMaterialDistinct=648 — material
 * 72x finer than raw, i.e. the function was silently reporting the full
 * internal selector-odometer period (=prosePeriod) relabelled as "material
 * distinctness of the reading". The fix: derive material from the SAME
 * `readingTiers().tier2` object raw already serialises, stable-key-sorted so
 * only genuine content differences (never key order) can move the count.
 */

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** The base reading's Tier-2 structural identity — the exact object Tier 2 renders, key-order-stable. */
export function baseMaterialSignature(baseTier2) {
  return stableStringify(baseTier2);
}

/** The heritage layer's Tier 2 (Reading) structural identity: ids only, never prose text. */
export function heritageTier2MaterialSignature(tier2Model) {
  return stableStringify({
    available: tier2Model.available,
    reason: tier2Model.reason,
    cardConnectorId: tier2Model.card ? tier2Model.card.connectorId ?? tier2Model.card.sourceId ?? null : null,
  });
}

/** The heritage layer's Tier 3 (Why/Study) structural identity — kept SEPARATE from Tier 2's,
 * because they are different consumer surfaces (§ GOLD grades Tier 1/2/3 independently), not
 * one merged "heritage" blob. */
export function heritageTier3MaterialSignature(tier3Model) {
  return stableStringify({
    active: tier3Model.active.map((c) => c.connectorId ?? c.sourceId ?? null),
    sourcePanelOnly: tier3Model.sourcePanelOnly.map((c) => c.connectorId ?? c.sourceId ?? null),
    disagreements: tier3Model.disagreements.map((d) => (
      `${d.disagreementId ?? ""}:${(d.positions || []).map((p) => p.positionId).join("|")}`
    )),
    abstentions: tier3Model.abstentions.map((a) => `${a.connectorId}:${(a.gateReasons || []).join("|")}`),
    editorial: tier3Model.editorial.map((e) => stableStringify(e)),
  });
}

/* ── the per-(construct,lineage) analysis ────────────────────────────────── */

export function analyseConstructLineage({ state, heritageConstruct, sourceLineage }) {
  const prosePeriod = variationCycle(state);
  const { residue: connRes, activeCount, derivedFrom } = connectorResidue(heritageConstruct, sourceLineage);
  const combinedPeriod = connRes === null ? null : lcm(prosePeriod, connRes);
  const walkBound = combinedPeriod === null ? DIVERSITY_WALK_CAP : Math.min(combinedPeriod, DIVERSITY_WALK_CAP);
  const exhaustive = combinedPeriod !== null && walkBound === combinedPeriod;

  const baseRaw = new Set(), baseMaterial = new Set();
  const heritageTier2Raw = new Set(), heritageTier2Material = new Set();
  const heritageTier3Raw = new Set(), heritageTier3Material = new Set();
  // "Combined" pairs the base reading with the HERITAGE TIER 2 (Reading) view —
  // the default daily consumer experience — never with Tier 3 (Why/Study),
  // which is a separate, deeper, optional surface reported on its own.
  const combinedRaw = new Set(), combinedMaterial = new Set();

  for (let occurrence = 0; occurrence < walkBound; occurrence++) {
    const composed = composeReading(state, { occurrence, includeSelfReport: false });
    const reflection = { state, composed };
    // readingTiers().tier2 is an OBJECT ({passage, attribution, bridge,
    // question, ...}), not a string — JSON.stringify it for the raw
    // byte-for-byte signature. A bare object in a Set counts REFERENCE
    // identity (always distinct, even for identical content) and coerces to
    // the literal string "[object Object]" under concatenation, which would
    // silently collapse every combined-raw signature to one value.
    const baseTier2 = readingTiers(reflection).tier2;
    const baseText = JSON.stringify(baseTier2);
    const baseMaterialSig = baseMaterialSignature(baseTier2);

    const result = composeLatent({ heritageConstruct, sourceLineage, depthMode: "SOURCE_DEEP", occurrence });
    const tier2Connectors = deriveTier2FromComposition(result);
    const tier2Model = tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY);
    const tier3Model = tier3ConnectorModel(result, SOURCE_REGISTRY);
    const heritageTier2Text = heritageConnectorTier2Markup(tier2Model);
    const heritageTier3Text = heritageConnectorTier3Markup(tier3Model);

    baseRaw.add(baseText);
    baseMaterial.add(baseMaterialSig);
    heritageTier2Raw.add(heritageTier2Text);
    heritageTier2Material.add(heritageTier2MaterialSignature(tier2Model));
    heritageTier3Raw.add(heritageTier3Text);
    heritageTier3Material.add(heritageTier3MaterialSignature(tier3Model));
    combinedRaw.add(baseText + "␟" + heritageTier2Text);
    combinedMaterial.add(baseMaterialSig + "␟" + heritageTier2MaterialSignature(tier2Model));
  }

  return {
    heritageConstruct,
    sourceLineage,
    prosePeriod,
    connectorResidue: connRes,
    connectorActiveCount: activeCount,
    connectorResidueDerivation: derivedFrom,
    combinedPeriod,
    occurrencesEvaluated: walkBound,
    stoppingProof: exhaustive
      ? `exhaustive: walked the full derived combined period (LCM(${prosePeriod}, ${connRes}) = ${combinedPeriod})`
      : `sampled: combined period ${combinedPeriod ?? "UNRESOLVED"} exceeds the ${DIVERSITY_WALK_CAP}-occurrence walk cap — counts below are a verified LOWER BOUND, not exhaustive`,
    baseReadingRawDistinct: baseRaw.size,
    baseReadingMaterialDistinct: baseMaterial.size,
    // Kept for report continuity: the Tier 2 (Reading) heritage numbers are
    // the ones GOLD's relationship-depth/diversity gates key off, since Tier 2
    // is the default daily consumer surface.
    heritageRawDistinct: heritageTier2Raw.size,
    heritageMaterialDistinct: heritageTier2Material.size,
    heritageTier3RawDistinct: heritageTier3Raw.size,
    heritageTier3MaterialDistinct: heritageTier3Material.size,
    combinedRawDistinct: combinedRaw.size,
    combinedMaterialDistinct: combinedMaterial.size,
  };
}

/* ── connector-identity collision check (anti-fragmentation, §56) ────────── */

export function connectorIdentityReport() {
  const bySourceText = new Map();
  for (const c of Object.values(HERITAGE_CONNECTOR_REGISTRY)) {
    const key = `${c.sourceId}::${(c.sourceText || "").trim()}`;
    if (!c.sourceText) continue; // no text to compare
    if (!bySourceText.has(key)) bySourceText.set(key, []);
    bySourceText.get(key).push(c.connectorId);
  }
  const collisions = [...bySourceText.entries()].filter(([, ids]) => ids.length > 1);
  return {
    totalConnectors: Object.keys(HERITAGE_CONNECTOR_REGISTRY).length,
    exactSourceTextCollisions: collisions.map(([key, ids]) => ({ key, connectorIds: ids })),
  };
}

/* ── main ─────────────────────────────────────────────────────────────────── */

export function main() {
  assertScopeMatchesCanonicalConstructs();

  const reachable = enumerateReachableStates();
  const coverage = summariseCoverage();

  // One representative reachable state per required construct, at the
  // abstract sourceLineage the real production path actually ever supplies
  // ("primary" — see docs/heritage-evidence/SAFETY_AUTHORIZATION_INTERFACE.md
  // and heritageRotation()). This is the LATENT analysis subject: what the
  // corpus could support if construct-level routing/authorisation were
  // resolved, not a claim about what already renders.
  const perConstruct = [];
  for (const constructId of HERITAGE_CONSTRUCT_IDS) {
    const representative = reachable.find((s) => s.heritageConstruct === constructId && s.sourceLineage === "primary")
      ?? reachable.find((s) => s.heritageConstruct === constructId);
    if (!representative) {
      perConstruct.push({ heritageConstruct: constructId, error: "NO_REACHABLE_STATE_FOUND — harness failure, not a content finding" });
      continue;
    }
    perConstruct.push(analyseConstructLineage({
      state: representative,
      heritageConstruct: constructId,
      sourceLineage: representative.sourceLineage,
    }));
  }

  const harnessFailed = perConstruct.some((p) => p.error);

  // Diagnostic-only: the three resolver depth modes, never a GOLD row.
  const internalResolverDiagnostic = HERITAGE_CONSTRUCT_IDS.map((constructId) => {
    const lineages = Object.keys(HERITAGE_REGISTRY[constructId].lineages);
    return {
      heritageConstruct: constructId,
      lineages: lineages.map((lineage) => {
        const modes = ["SUMMARY", "STANDARD", "SOURCE_DEEP"].map((depthMode) => {
          const r = composeLatent({ heritageConstruct: constructId, sourceLineage: lineage, depthMode, occurrence: 0 });
          return { depthMode, activeCount: (r.active || []).length, sourcePanelCount: (r.sourcePanelOnly || []).length };
        });
        return { lineage, modes, label: "INTERNAL_RESOLVER_DIAGNOSTIC — not a consumer-facing GOLD row" };
      }),
    };
  });

  const connectorIdentity = connectorIdentityReport();

  /* ── failure taxonomy per required construct ─────────────────────────── */
  const failureTaxonomy = HERITAGE_CONSTRUCT_IDS.map((constructId) => {
    const scope = REQUIRED_HERITAGE_SCOPE[constructId];
    const analysis = perConstruct.find((p) => p.heritageConstruct === constructId);
    let taxonomy;
    if (scope.class === "COVERAGE_GAP") taxonomy = "COVERAGE_GAP";
    else if (scope.class === "DECISION_BLOCKED") taxonomy = "LINEAGE_DECISION_BLOCKED";
    else if (scope.class === "ARCHITECTURE_BLOCKED") taxonomy = "MULTI_WITNESS_ARCHITECTURE_BLOCKED";
    else if (scope.class === "RUNTIME_SUPPORTED" && analysis && analysis.heritageMaterialDistinct <= 1) taxonomy = "RELATIONSHIP_DEPTH_LIMITED";
    else if (scope.class === "RUNTIME_SUPPORTED" && analysis && analysis.combinedMaterialDistinct < DIVERSITY_TARGET) taxonomy = "PROSE_DEPTH_LIMITED";
    else taxonomy = "RUNTIME_POLICY_BLOCKED";
    return { heritageConstruct: constructId, class: scope.class, taxonomy, blockedByDecisionCard: scope.blockedByDecisionCard };
  });

  /* ── the five GOLD gates, conjunctive, never averaged ────────────────── */
  const gateA_evidenceIntegrity = connectorIdentity.exactSourceTextCollisions.length === 0;
  const gateB_requiredCoverage = coverage.RUNTIME_SUPPORTED.length === HERITAGE_CONSTRUCT_IDS.length;
  const gateC_relationshipDepth = perConstruct.every((p) => !p.error && p.heritageMaterialDistinct >= 2);
  const gateD_materialDiversity = perConstruct.every((p) => !p.error && p.combinedMaterialDistinct >= DIVERSITY_TARGET);
  const gateE_deterministicCorrectness = perConstruct.every((p) => !p.error && p.connectorResidue !== null);

  const gold = !harnessFailed && gateA_evidenceIntegrity && gateB_requiredCoverage && gateC_relationshipDepth
    && gateD_materialDiversity && gateE_deterministicCorrectness;

  const report = {
    harnessVersion: HARNESS_VERSION,
    commit: gitCommit(),
    generatedAt: new Date().toISOString(),
    disclaimer: "THIS EVALUATES LATENT LIBRARY CAPABILITY USING THE INTERNAL COMPOSITION SEAM. "
      + "IT DOES NOT AUTHORIZE STAGE 3 PRODUCTION OUTPUT. Safety authorization is currently "
      + "UNKNOWN/unset in production and remains fail-closed until an explicit approved safety "
      + "decision or implemented authoritative signal changes that state.",
    requiredScope: REQUIRED_HERITAGE_SCOPE,
    coverageSummary: coverage,
    reachableStatesTotal: reachable.length,
    perConstructAnalysis: perConstruct,
    internalResolverDiagnostic,
    connectorIdentity,
    failureTaxonomy,
    gates: {
      A_evidenceIntegrity: gateA_evidenceIntegrity,
      B_requiredConstructCoverage: gateB_requiredCoverage,
      C_heritageRelationshipDepth: gateC_relationshipDepth,
      D_materialPresentationDiversity: gateD_materialDiversity,
      E_deterministicCorrectness: gateE_deterministicCorrectness,
    },
    result: harnessFailed ? "HARNESS_FAILURE" : (gold ? "GOLD" : "NOT_READY"),
  };

  console.log(`\n=== HERITAGE READINESS — harness v${HARNESS_VERSION} — commit ${report.commit} ===`);
  console.log(report.disclaimer);
  console.log(`\nRequired scope (${HERITAGE_CONSTRUCT_IDS.length} constructs):`);
  for (const c of COVERAGE_CLASSES) {
    console.log(`  ${c}: ${coverage[c].length ? coverage[c].join(", ") : "(none)"}`);
  }
  console.log(`\nReachable states (full Reflection Engine state space): ${reachable.length}`);
  console.log("\nPer-construct latent analysis:");
  for (const p of perConstruct) {
    if (p.error) { console.log(`  ${p.heritageConstruct}: ${p.error}`); continue; }
    console.log(`  ${p.heritageConstruct}/${p.sourceLineage}: prose period=${p.prosePeriod} connector residue=${p.connectorResidue}`
      + ` combined=${p.combinedPeriod} evaluated=${p.occurrencesEvaluated} (${p.stoppingProof})`);
    console.log(`    base raw/material=${p.baseReadingRawDistinct}/${p.baseReadingMaterialDistinct}`
      + `  heritage(Tier2) raw/material=${p.heritageRawDistinct}/${p.heritageMaterialDistinct}`
      + `  heritage(Tier3) raw/material=${p.heritageTier3RawDistinct}/${p.heritageTier3MaterialDistinct}`
      + `  combined(base+Tier2) raw/material=${p.combinedRawDistinct}/${p.combinedMaterialDistinct}`);
  }
  console.log("\nFailure taxonomy:");
  for (const f of failureTaxonomy) console.log(`  ${f.heritageConstruct}: ${f.taxonomy}${f.blockedByDecisionCard ? ` (${f.blockedByDecisionCard})` : ""}`);
  console.log("\nConnector identity:", connectorIdentity.totalConnectors, "total,",
    connectorIdentity.exactSourceTextCollisions.length, "exact-sourceText collisions");
  console.log("\nGates:", JSON.stringify(report.gates));
  console.log(`\n>>> RESULT: ${report.result} <<<\n`);

  const outPath = process.argv[2];
  if (outPath) {
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Full report written to ${outPath}`);
  }

  // Only a genuine harness failure exits non-zero. NOT_READY is a valid,
  // honest, exit-0 result.
  process.exit(harnessFailed ? 1 : 0);
}

/*
 * ENTRYPOINT GUARD.
 *
 * `main()` calls `process.exit()`, so this file must only run it when
 * invoked directly (`node scripts/heritage-readiness.mjs`) — never merely
 * because something imported it. `scripts/retention-sim.mjs` imports this
 * module's internals (`canonicalRegistries`, `composeLatent`,
 * `analyseConstructLineage`, the material-signature functions) for
 * LATENT_HERITAGE_EXHAUSTION; without this guard that import would run the
 * whole harness and terminate the importing process.
 *
 * `process.argv[1]` vs `import.meta.url` is a POSIX-path comparison here —
 * this container is Linux. Windows path casing/separator behaviour for this
 * exact comparison is NOT VERIFIED in this environment.
 */
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
