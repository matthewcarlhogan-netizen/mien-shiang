#!/usr/bin/env node
/*
 * RETENTION / EXHAUSTION SIMULATOR — FOUR SEPARATELY LABELLED ANALYSES.
 *
 * `npm run retention:sim`. PR B cannot validate retention for the completed
 * future product, because its strongest new mechanism — the Daily Portrait
 * timeline — is deliberately not implemented until PR C. Reporting one
 * combined number as "retention validated" would misstate what was actually
 * measured, and it would compound that misstatement if a simulation silently
 * ran under the INTERNAL Reflection Engine configuration and reported it as
 * "current retention".
 *
 * `src/qise/reading-flags.js` makes the split explicit: `off` remains
 * available for comparison, while the closed-beta default is `on`. This
 * script never lets an ambient hostname pick the mode: it runs BOTH
 * `oldReading()` (the legacy passage engine) and `reflectionFor()` (the
 * Reflection Engine) explicitly, on the same synthetic history, and reports
 * them as two separate, named analyses.
 *
 * The four analyses, NEVER collapsed into one verdict:
 *
 *   A. PUBLIC_SHIPPED_RETENTION       — what a public-origin visitor gets today.
 *   B. INTERNAL_REFLECTION_RETENTION  — the closed-beta Reflection Engine path.
 *   C. LATENT_HERITAGE_EXHAUSTION     — GOLD heritage depth measured through
 *                                        the internal analytical seam.
 *   D. DAILY_PORTRAIT_COMPOUNDING_MODEL — architecture-level projection only;
 *                                        no runtime code exists to execute
 *                                        against, because Daily Portrait is
 *                                        not implemented in this repository.
 *
 * A and B reuse `scripts/lib/reading-simulation.mjs` (the same real-pixel-
 * path primitives `scripts/parity.mjs` uses) for the base capture arithmetic;
 * only the day-to-day "weather" is scenario-specific, and even that follows
 * the same seeded-LCG-determinism discipline `simulateDays()` already
 * established. C reuses `scripts/heritage-readiness.mjs`'s internal seam and
 * (corrected) material-signature functions rather than a second
 * implementation.
 */

import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  MEASURED, recordFor, oldReading, exposureStats, dayString, repeatExposure,
} from "./lib/reading-simulation.mjs";
import { reflectionFor, heritageRotation } from "../src/qise/reading-pipeline.js";
import { stateKey as deriveStateKey } from "../src/qise/reading-state.js";
import { HERITAGE_CONSTRUCT_IDS } from "../src/heritage/constants.js";
import { REQUIRED_HERITAGE_SCOPE } from "./heritage-readiness/required-scope.mjs";
import {
  canonicalRegistries, composeLatent, analyseConstructLineage,
  heritageTier2MaterialSignature,
} from "./heritage-readiness.mjs";
import { deriveTier2FromComposition } from "../src/qise/heritage-connections.js";
import { tier2ConnectorModel } from "../src/ui/qise/heritage-view.js";
import { SOURCE_REGISTRY } from "../src/reading/provenance.js";
import { enumerateReachableStates } from "../src/qise/reading-state.js";

const SIM_VERSION = "1.1.0";
const HORIZONS = [30, 90, 365];
const DAILY_PORTRAIT_HORIZONS = [7, 30, 90, 365];

function gitCommit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: fileURLToPath(new URL("..", import.meta.url)) }).toString().trim();
  } catch {
    return "UNKNOWN";
  }
}

/* ── generic scenario runner over the real pixel path ────────────────────── */

function makeRnd(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

/**
 * Runs `weatherFn(i)` — a pure function of day index returning
 * `{axes, confidence}` or `{skip:true}` for a missed day — through the SAME
 * real capture arithmetic `simulateDays()` uses (`recordFor`, `oldReading`,
 * `reflectionFor`), for `n` calendar days. A skipped day still advances the
 * calendar (canonicalDay/heritageConstruct rotation continue) but is not
 * appended to history — a gap in the record, never interpolated
 * (docs/RETENTION_EXPERIENCE_CONTRACT.md).
 */
export function runScenario(n, weatherFn) {
  const history = [];
  const days = [];
  for (let i = 0; i < n; i++) {
    const weather = weatherFn(i);
    if (weather.skip) continue;
    const record = recordFor({ axesSource: weather.axes, history: [...history], confidence: weather.confidence, dayIdx: i });
    const oldOut = oldReading(record, history);
    const fresh = reflectionFor(record, history);
    const canonicalDay = record.canonicalDay;
    const rotation = heritageRotation(canonicalDay);
    days.push({
      i,
      canonicalDay,
      heritageConstruct: rotation.heritageConstruct,
      sourceLineage: rotation.sourceLineage,
      stateKey: fresh ? deriveStateKey(fresh.state) : null,
      occurrence: fresh ? fresh.occurrence : 0,
      oldText: oldOut.text,
      newText: fresh ? fresh.composed.text : "",
      availability: fresh ? fresh.state.availability : null,
    });
    history.push({ ...record, axes: weather.axes, valid: true });
  }
  return days;
}

/* ── §11 dedicated scenario weather generators ───────────────────────────── */
/*
 * The default `simulateDays()` weather (seasonal drift + weekly rhythm +
 * shocks + 12%-chance low confidence) already exercises: frequent movement
 * (weekly rhythm + shocks), low-confidence captures (built in), a
 * long-established baseline (accumulating history), and construct rotation
 * (the natural 6-day `heritageRotation` cycle, inherent to every generator
 * here since canonicalDay always advances one real day at a time). These
 * four are NOT re-implemented as separate generators — that would duplicate
 * `simulateDays()`'s own weather formula for no new coverage. What it does
 * NOT cover needs its own generator, below.
 */

export function weatherMostlySteady() {
  const rnd = makeRnd(9101);
  const base = MEASURED.neutral;
  return () => ({
    axes: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v + (rnd() - 0.5) * 0.15])),
    confidence: 0.85 + rnd() * 0.1,
  });
}

export function weatherRepeatedSameMovement() {
  const rnd = makeRnd(9102);
  const base = MEASURED.neutral;
  const shifted = { ...base, a: base.a + 2.0, ming: base.ming + 0.3 };
  return () => ({
    axes: Object.fromEntries(Object.entries(shifted).map(([k, v]) => [k, v + (rnd() - 0.5) * 0.08])),
    confidence: 0.85,
  });
}

export function weatherSettling() {
  const rnd = makeRnd(9103);
  const base = MEASURED.neutral;
  return (i) => {
    const decay = Math.exp(-i / 12);
    return {
      axes: { ...base, a: base.a + 3.0 * decay, run: base.run + 1.5 * decay + (rnd() - 0.5) * 0.2 },
      confidence: 0.85,
    };
  };
}

export function weatherIntermittentMissedDays() {
  const rnd = makeRnd(9104);
  const base = MEASURED.neutral;
  return (i) => {
    if (i % 3 === 2) return { skip: true };
    return {
      axes: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v + (rnd() - 0.5) * 0.5])),
      confidence: 0.8,
    };
  };
}

const DEDICATED_SCENARIOS = Object.freeze({
  mostlySteady: weatherMostlySteady,
  repeatedSameMovement: weatherRepeatedSameMovement,
  settling: weatherSettling,
  intermittentMissedDays: weatherIntermittentMissedDays,
});

/**
 * Mirrors `simulateDays()`'s own weather (seasonal drift + weekly rhythm +
 * occasional shocks) so the calendar-exhaustion cross-check in analysis C can
 * contrast a STEADY user against a more VARIABLE one, using the same
 * generic `runScenario()` (which the shared `simulateDays()` does not expose
 * — it returns aggregated stats only, not per-day occurrence/canonicalDay).
 * A different seed from `simulateDays()`'s own 20260817 on purpose: this is
 * a separate labelled draw for the C cross-check, not a claim of numeric
 * parity with the A/B "default" scenario's own reported figures.
 */
export function weatherFrequentMovementLike() {
  const rnd = makeRnd(20260901);
  const base = MEASURED.neutral;
  return (i) => {
    const season = Math.sin((i / 365) * Math.PI * 2) * 0.8;
    const weekly = Math.sin((i / 7) * Math.PI * 2) * 0.35;
    const shock = rnd() < 0.06 ? (rnd() - 0.5) * 6 : 0;
    return {
      axes: {
        a: base.a + season + weekly + (rnd() - 0.5) * 0.6 + shock * 0.4,
        b: base.b + season * 0.6 + (rnd() - 0.5) * 0.5,
        L: base.L + weekly * 0.8 + (rnd() - 0.5) * 0.7 - Math.max(0, shock) * 0.3,
        C: base.C + (rnd() - 0.5) * 0.6,
        periorbitalL: base.periorbitalL - Math.max(0, weekly) * 1.2 + (rnd() - 0.5) * 0.8,
        ming: base.ming + (rnd() - 0.5) * 0.4,
        run: base.run + season * 0.5 + (rnd() - 0.5) * 0.5,
      },
      confidence: rnd() < 0.12 ? 0.45 + rnd() * 0.14 : 0.72 + rnd() * 0.26,
    };
  };
}

/* ── A. PUBLIC_SHIPPED_RETENTION / B. INTERNAL_REFLECTION_RETENTION ──────── */

function analysesAB() {
  const defaultExposure = repeatExposure(HORIZONS);

  const dedicated = {};
  for (const [name, weatherFactory] of Object.entries(DEDICATED_SCENARIOS)) {
    dedicated[name] = {};
    for (const n of HORIZONS) {
      const days = runScenario(n, weatherFactory());
      dedicated[name][n] = {
        old: exposureStats(days, (d) => d.oldText),
        next: exposureStats(days, (d) => d.newText),
        abstentionRate: days.length ? days.filter((d) => d.availability !== "read").length / days.length : 0,
        calendarDays: n,
        capturedDays: days.length,
      };
    }
  }

  // Cross-reference, not a simulation: which construct is naturally on
  // rotation on each of a 365-day run's calendar days, classified against
  // the B2 required-scope coverage — i.e. on how many days would the
  // The fixed GOLD scope classifies some constructs outside
  // RUNTIME_SUPPORTED. That is an analytical label; the closed-beta runtime
  // has explicit routes for those slots and can still render material.
  const rotationHorizon = 365;
  const constructDayCounts = Object.fromEntries(HERITAGE_CONSTRUCT_IDS.map((id) => [id, 0]));
  for (let i = 0; i < rotationHorizon; i++) {
    const { heritageConstruct } = heritageRotation(dayString(i));
    constructDayCounts[heritageConstruct] = (constructDayCounts[heritageConstruct] || 0) + 1;
  }
  const unavailableConstructDays = HERITAGE_CONSTRUCT_IDS
    .filter((id) => REQUIRED_HERITAGE_SCOPE[id].class !== "RUNTIME_SUPPORTED")
    .reduce((sum, id) => sum + (constructDayCounts[id] || 0), 0);

  return {
    defaultScenario: defaultExposure,
    dedicatedScenarios: dedicated,
    constructRotationCrossReference: {
      horizonDays: rotationHorizon,
      dayCountByConstruct: constructDayCounts,
      daysWithCurrentlyUnavailableConstruct: unavailableConstructDays,
      note: "Every generator above advances the calendar one real day at a time, so the natural "
        + "6-day heritageRotation() cycle is exercised inherently — this is a classification of "
        + "that rotation against B2's REQUIRED_HERITAGE_SCOPE, not a tenth separate scenario. "
        + `${unavailableConstructDays}/${rotationHorizon} days over a year land on a construct `
        + "outside the fixed GOLD RUNTIME_SUPPORTED class. Closed-beta routing still renders "
        + "bounded attributed material for those slots; this is an analytical scope warning.",
    },
  };
}

/* ── C. LATENT_HERITAGE_EXHAUSTION ────────────────────────────────────────── */

/**
 * Real-calendar cross-check on top of B3's exhaustive per-construct analysis:
 * using the REAL simulated days from one dedicated scenario (mostlySteady —
 * chosen because it is the closest proxy for a returning daily user), for
 * each required construct, walk the calendar days on which that construct is
 * naturally on rotation and, at the REAL occurrence value `reflectionFor()`
 * derived for that real day, ask (via the same LATENT internal seam B3 uses)
 * what the Tier 2 heritage presentation would be if authorised. Reports the
 * calendar day on which the running set of distinct presentations stops
 * growing — i.e. the day a real user of this scenario would have "seen it
 * all", if the construct were authorised. This never overrides rotation or
 * fabricates an occurrence; it reuses exactly the occurrence value the base
 * reading itself used that day.
 */
export function exhaustionTimeline(days, constructId) {
  const seen = new Set();
  let lastGrowthDay = null;
  let onConstructDays = 0;
  for (const day of days) {
    if (day.heritageConstruct !== constructId) continue;
    onConstructDays++;
    const result = composeLatent({ heritageConstruct: constructId, sourceLineage: day.sourceLineage || "primary", depthMode: "SOURCE_DEEP", occurrence: day.occurrence });
    const tier2Connectors = deriveTier2FromComposition(result);
    const tier2Model = tier2ConnectorModel(tier2Connectors, SOURCE_REGISTRY);
    const sig = heritageTier2MaterialSignature(tier2Model);
    const before = seen.size;
    seen.add(sig);
    if (seen.size > before) lastGrowthDay = day.i;
  }
  let status;
  if (onConstructDays === 0) status = "CONSTRUCT_NEVER_REACHED_WITHIN_HORIZON";
  else if (seen.size <= 1) status = "NO_ROTATION_OBSERVED_IN_THIS_SCENARIO";
  else status = `EXHAUSTED_BY_CALENDAR_DAY_${lastGrowthDay}`;
  return {
    heritageConstruct: constructId,
    daysOnThisConstructWithinHorizon: onConstructDays,
    distinctTier2PresentationsSeen: seen.size,
    lastNewPresentationAtCalendarDay: lastGrowthDay,
    status,
  };
}

function analysisC() {
  const reachable = enumerateReachableStates();
  const perConstructExhaustive = [];
  for (const constructId of HERITAGE_CONSTRUCT_IDS) {
    const representative = reachable.find((s) => s.heritageConstruct === constructId && s.sourceLineage === "primary")
      ?? reachable.find((s) => s.heritageConstruct === constructId);
    if (!representative) {
      perConstructExhaustive.push({ heritageConstruct: constructId, error: "NO_REACHABLE_STATE_FOUND" });
      continue;
    }
    perConstructExhaustive.push(analyseConstructLineage({
      state: representative,
      heritageConstruct: constructId,
      sourceLineage: representative.sourceLineage,
    }));
  }

  const steadyDays = runScenario(365, weatherMostlySteady());
  const variableDays = runScenario(365, weatherFrequentMovementLike());
  const calendarExhaustionSteady = HERITAGE_CONSTRUCT_IDS.map((id) => exhaustionTimeline(steadyDays, id));
  const calendarExhaustionVariable = HERITAGE_CONSTRUCT_IDS.map((id) => exhaustionTimeline(variableDays, id));

  // This is a content-depth cross-check, not a runtime authorization check.
  // The expanded beta graph now rotates across the pinned source disagreements
  // that have an explicit runtime route. Source-panel-only fortune material
  // remains source-panel-only under its recorded policy.
  const noConnectorRotationAnywhere = perConstructExhaustive.every((p) => p.error || p.connectorResidue === 1);

  return {
    disclaimer: "GOLD analytical depth — uses the same internal composition seam as "
      + "scripts/heritage-readiness.mjs (composeHeritageConnectionsWithRegistries). Closed-beta "
      + "runtime uses the canonical Stage-3 path and named beta policy; this analysis does not "
      + "clear source rights, provenance, or commercial-release obligations.",
    exhaustiveDepthPerConstruct: perConstructExhaustive,
    note: "The exhaustive figures above are the library's full measured depth (every occurrence "
      + "residue class visited). The two calendar cross-checks below show what a REAL 365-day user "
      + "would actually encounter, which depends on how often their own reading repeats an exact "
      + "prior state (occurrence only advances on a repeat) — a steady user and a variable one can "
      + "see very different slices of the same latent depth.",
    noConnectorRotationAnywhereUnderCurrentEvidence: noConnectorRotationAnywhere,
    noConnectorRotationExplanation: noConnectorRotationAnywhere
      ? "Every required construct's connectorResidue is 1 under the current graph. This means "
        + "the beta runtime has no connector rotation to show yet; it is a measured content-depth "
        + "limit, not a rights/readiness switch."
      : "At least one required construct has a connector residue > 1. The expanded beta graph "
        + "now provides genuine connector rotation for those constructs; see perConstructExhaustive "
        + "and the calendar cross-checks for whether a real user's occurrence range reaches it.",
    calendarExhaustionUnderMostlySteadyScenario: calendarExhaustionSteady,
    calendarExhaustionUnderFrequentMovementLikeScenario: calendarExhaustionVariable,
  };
}

/* ── D. DAILY_PORTRAIT_COMPOUNDING_MODEL ──────────────────────────────────── */

const DAILY_PORTRAIT_CAPABILITY_NOTES = Object.freeze({
  7: "First week of real frames exists. Too short for any comparison beyond yesterday-to-today; "
    + "the timeline is a short, real list, not yet a history.",
  30: "One calendar month of frames. Week-over-week alignment comparison becomes meaningful for "
    + "the first time — enough frames exist to show a trajectory rather than isolated points.",
  90: "One season of frames. This is the horizon docs/DAILY_PORTRAIT_ARCHITECTURE.md's adopted "
    + "behavioural contract (one-canonical-day, deterministic retake) treats as a long-established "
    + "run, by analogy with the Qi Se baseline's own historyStage bands.",
  365: "A full year of frames. The first calendar-anniversary comparison becomes possible, and "
    + "every season is represented at least once — the timeline's compounding value (why Day 90 "
    + "is a richer product experience than Day 3) is fully realised only from here.",
});

/**
 * PROJECTION ONLY — no Daily Portrait runtime code exists in this repository
 * to execute against (PR C, not yet started). This applies the SAME
 * day-inclusion pattern already measured in the §11 scenario battery above
 * (a scenario's real captured-day count at a horizon) to a hypothetical
 * one-frame-per-included-day timeline, per docs/DAILY_PORTRAIT_ARCHITECTURE.md's
 * schema. No image, storage, or persistence code executes anywhere in this
 * function.
 */
function analysisD() {
  const capturedDaysByScenario = { frequentMovementDefault: {} };
  for (const h of DAILY_PORTRAIT_HORIZONS) capturedDaysByScenario.frequentMovementDefault[h] = h; // simulateDays() never skips a day

  for (const [name, weatherFactory] of Object.entries(DEDICATED_SCENARIOS)) {
    capturedDaysByScenario[name] = {};
    for (const h of DAILY_PORTRAIT_HORIZONS) {
      // Only intermittentMissedDays actually skips a day; the others always
      // capture every calendar day, but are re-measured uniformly rather
      // than assumed, so a future scenario that skips days is caught too.
      capturedDaysByScenario[name][h] = runScenario(h, weatherFactory()).length;
    }
  }

  const rows = DAILY_PORTRAIT_HORIZONS.map((horizonDays) => {
    const byScenario = {};
    for (const [name, byHorizon] of Object.entries(capturedDaysByScenario)) {
      const capturedFrames = byHorizon[horizonDays];
      byScenario[name] = { capturedFrames, timelineCompleteness: capturedFrames / horizonDays };
    }
    return { horizonDays, capabilityNote: DAILY_PORTRAIT_CAPABILITY_NOTES[horizonDays], byScenario };
  });

  return {
    disclaimer: "MODELLED, NOT RUNTIME-VALIDATED. Daily Portrait has no implementation in this "
      + "repository (PR C). This is a worked calculation against "
      + "docs/DAILY_PORTRAIT_ARCHITECTURE.md's one-day-one-primary-frame schema, using the same "
      + "day-inclusion patterns already measured for the reading engine above (a missed day is a "
      + "gap, never interpolated — the same rule this model applies to a timeline frame).",
    horizons: rows,
  };
}

/* ── report ───────────────────────────────────────────────────────────────── */

function main() {
  const ab = analysesAB();
  const c = analysisC();
  const d = analysisD();

  const report = {
    simVersion: SIM_VERSION,
    commit: gitCommit(),
    generatedAt: new Date().toISOString(),
    PUBLIC_SHIPPED_RETENTION: {
      label: "What a public-origin visitor experiences TODAY (reflectionMode=off, the shipped passage engine).",
      defaultScenarioByHorizon: Object.fromEntries(HORIZONS.map((h) => [h, ab.defaultScenario[h].old])),
      dedicatedScenarios: Object.fromEntries(
        Object.entries(ab.dedicatedScenarios).map(([name, byHorizon]) => [
          name,
          Object.fromEntries(HORIZONS.map((h) => [h, { ...byHorizon[h].old, calendarDays: byHorizon[h].calendarDays, capturedDays: byHorizon[h].capturedDays }])),
        ]),
      ),
    },
    INTERNAL_REFLECTION_RETENTION: {
      label: "The closed-beta Reflection Engine path (reflectionMode=on). "
        + "Heritage connector presentation is enabled by the named beta policy; this analysis "
        + "still does not clear external rights, provenance, or commercial-release obligations.",
      defaultScenarioByHorizon: Object.fromEntries(HORIZONS.map((h) => [h, ab.defaultScenario[h].next])),
      dedicatedScenarios: Object.fromEntries(
        Object.entries(ab.dedicatedScenarios).map(([name, byHorizon]) => [
          name,
          Object.fromEntries(HORIZONS.map((h) => [h, { ...byHorizon[h].next, calendarDays: byHorizon[h].calendarDays, capturedDays: byHorizon[h].capturedDays }])),
        ]),
      ),
    },
    constructRotationCrossReference: ab.constructRotationCrossReference,
    LATENT_HERITAGE_EXHAUSTION: c,
    DAILY_PORTRAIT_COMPOUNDING_MODEL: d,
    fullDailyPortraitRetention: "NOT_YET_RUNTIME_VALIDATED — Daily Portrait has no implementation; "
      + "PR C is required before product-wide retention can be runtime-measured.",
  };

  console.log(`\n=== RETENTION / EXHAUSTION SIMULATOR — v${SIM_VERSION} — commit ${report.commit} ===\n`);

  console.log("A. PUBLIC_SHIPPED_RETENTION (reflectionMode=off — the shipped passage engine)");
  for (const h of HORIZONS) {
    const s = ab.defaultScenario[h].old;
    console.log(`  default/${h}d: verbatim repeat ${(s.verbatimRepeatRate * 100).toFixed(1)}%  distinct ${s.distinctTexts}  near-dup ${(s.nearDuplicateRate * 100).toFixed(1)}%`);
  }
  for (const [name, byHorizon] of Object.entries(ab.dedicatedScenarios)) {
    const s = byHorizon[365].old;
    console.log(`  ${name}/365d: verbatim repeat ${(s.verbatimRepeatRate * 100).toFixed(1)}%  distinct ${s.distinctTexts}  captured ${byHorizon[365].capturedDays}/365 days`);
  }

  console.log("\nB. INTERNAL_REFLECTION_RETENTION (reflectionMode=on — closed-beta Reflection Engine)");
  for (const h of HORIZONS) {
    const s = ab.defaultScenario[h].next;
    console.log(`  default/${h}d: verbatim repeat ${(s.verbatimRepeatRate * 100).toFixed(1)}%  distinct ${s.distinctTexts}  near-dup ${(s.nearDuplicateRate * 100).toFixed(1)}%`);
  }
  for (const [name, byHorizon] of Object.entries(ab.dedicatedScenarios)) {
    const s = byHorizon[365].next;
    console.log(`  ${name}/365d: verbatim repeat ${(s.verbatimRepeatRate * 100).toFixed(1)}%  distinct ${s.distinctTexts}  captured ${byHorizon[365].capturedDays}/365 days`);
  }

  console.log(`\nConstruct rotation cross-reference (365d): ${ab.constructRotationCrossReference.daysWithCurrentlyUnavailableConstruct}/365 days land on a currently non-RUNTIME_SUPPORTED construct`);

  console.log("\nC. LATENT_HERITAGE_EXHAUSTION (GOLD analytical seam — not a rights or commercial-release clearance)");
  for (const p of c.exhaustiveDepthPerConstruct) {
    if (p.error) { console.log(`  ${p.heritageConstruct}: ${p.error}`); continue; }
    console.log(`  ${p.heritageConstruct}: exhaustive combined-material=${p.combinedMaterialDistinct} over period ${p.combinedPeriod} (${p.stoppingProof.split(":")[0]})`);
  }
  for (const t of c.calendarExhaustionUnderMostlySteadyScenario) {
    console.log(`  ${t.heritageConstruct} (mostlySteady/365d calendar): ${t.status} (${t.daysOnThisConstructWithinHorizon} days on rotation, ${t.distinctTier2PresentationsSeen} distinct presentations seen)`);
  }
  for (const t of c.calendarExhaustionUnderFrequentMovementLikeScenario) {
    console.log(`  ${t.heritageConstruct} (frequentMovementLike/365d calendar): ${t.status} (${t.daysOnThisConstructWithinHorizon} days on rotation, ${t.distinctTier2PresentationsSeen} distinct presentations seen)`);
  }
  console.log(`  ${c.noConnectorRotationExplanation}`);

  console.log("\nD. DAILY_PORTRAIT_COMPOUNDING_MODEL (modelled projection — no runtime code exists)");
  for (const row of d.horizons) {
    console.log(`  ${row.horizonDays}d: ${row.capabilityNote}`);
  }

  console.log(`\n${report.fullDailyPortraitRetention}\n`);

  const outPath = process.argv[2];
  if (outPath) {
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Full report written to ${outPath}`);
  }

  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
