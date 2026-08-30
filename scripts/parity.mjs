/*
 * THE PARITY HARNESS — a migration gate, not a diff.
 *
 * The question "are the two engines the same?" is the wrong one and answering
 * it would be actively harmful: the Reflection Engine is supposed to say more
 * than the passage engine, so string equality would score every intended
 * improvement as a failure and push the corpus back toward what it replaced.
 *
 * The right questions are the four the owner set, and each is answered by a
 * measurement rather than a reading of the output:
 *
 *   COVERAGE        every record the old engine renders, the new one renders.
 *   PRESERVATION    where they differ, nothing the old one carried is lost.
 *   PERSONALISATION the dimensions the old engine collapsed are expressed.
 *   SAFETY          the new engine is never more assertive, less abstaining or
 *                   less traceable than the one it replaces.
 *
 * ── WHY THE LONG RUNS SYNTHESISE AXES INSTEAD OF PAINTING PIXELS ───────────
 * The 30/90/365-day exposure analysis needs hundreds of consecutive readings.
 * Painting and reading a face for each would take minutes and would measure the
 * fixture generator, not the engines. So the base axes come from the real pixel
 * path — real ROI reads, real Lab, real metrics — and the day-to-day drift is
 * synthesised on top. Every reading still passes through the real
 * `interpretReading`, the real baseline, the real compass. The only synthetic
 * part is the weather.
 */

import { readingStateFromRecord, reflectionFor, heritageRotation } from "../src/qise/reading-pipeline.js";
import { READING_AFFECTING, stateKey, isReachable } from "../src/qise/reading-state.js";
import { findAssertive } from "./copy-scan.js";
import {
  measure, SKINS, MEASURED, dayString, historyRows, recordFor, oldReading,
  jaccard, simulateDays, exposureStats, repeatExposure,
} from "./lib/reading-simulation.mjs";

export {
  measure, SKINS, MEASURED, historyRows, recordFor, oldReading,
  jaccard, simulateDays, exposureStats, repeatExposure,
};

/* ── the claim vocabulary, kept in step with no-medical-language.test.js ──── */

export const BANNED_STEMS = [
  "diagnos", "disease", "symptom", "treat", "cure", "healthy", "unhealthy",
  "deficien", "organ", "liver", "kidney", "spleen", "lung", "heart",
  "predict", "forecast", "illness", "medical", "patient", "therapy",
];
const BANNED = new RegExp(String.raw`\b(${BANNED_STEMS.join("|")})`, "i");

/** Markers of a sentence that tells the user what is true of them. */
export function claimProfile(text) {
  const s = String(text || "");
  return {
    banned: BANNED.test(s),
    assertive: findAssertive([s]).length,
    secondPersonFuture: /\byou will\b|\byou'll\b/i.test(s),
    // Hedges are the opposite signal: language that holds a reading loosely.
    hedges: (s.match(/\b(may|might|appears|seems|loosely|harder to|cannot be separated|not read)\b/gi) || []).length,
    words: s.trim().split(/\s+/).filter(Boolean).length,
  };
}

/* ── the corpus of real records ──────────────────────────────────────────── */

export function buildCorpus() {
  const cases = [];
  let id = 0;
  for (const [skin, axes] of Object.entries(MEASURED))
    for (const historyLength of [0, 2, 8, 20])
      for (const confidence of [0.95, 0.8, 0.65, 0.45])
        for (const dayIdx of [0, 1, 2, 3, 4, 5])
          for (const captureClass of ["auto", "upload"]) {
            const history = historyRows(MEASURED.neutral, historyLength, { captureClass });
            const record = recordFor({ axesSource: axes, history, confidence, dayIdx, captureClass });
            cases.push({ id: `c${id++}`, skin, historyLength, confidence, dayIdx, captureClass, record, history });
          }
  return cases;
}

/* ── classification ──────────────────────────────────────────────────────── */

export const CLASSES = Object.freeze([
  "intentional improvement",
  "expected architectural difference",
  "regression",
  "unsupported old behaviour intentionally removed",
  "needs review",
]);

/**
 * Classify one divergence.
 *
 * Every branch is a rule about MEANING, never about characters. The default is
 * "needs review" rather than "fine": an unclassifiable difference is the one
 * most likely to be the interesting one, and a harness that silently absorbs
 * what it cannot explain is a harness that reports success.
 */
export function classify(entry) {
  const { state, old: oldOut, next, oldClaims, newClaims } = entry;
  const reasons = [];

  if (!next.renderable) {
    return { classification: "regression", reasons: ["the new engine produced no reading for a record the old one rendered"] };
  }

  if (newClaims.banned && !oldClaims.banned) {
    return { classification: "regression", reasons: ["the new reading introduces a banned clinical stem"] };
  }
  if (newClaims.assertive > oldClaims.assertive) {
    return { classification: "regression", reasons: [`assertive phrasing rose from ${oldClaims.assertive} to ${newClaims.assertive}`] };
  }
  if (newClaims.secondPersonFuture && !oldClaims.secondPersonFuture) {
    return { classification: "regression", reasons: ["the new reading makes a claim about the future"] };
  }

  // The new engine abstains where the old one asserted. This is the single
  // most valuable difference between them and it is not a loss of content.
  if (state.availability !== "read" && !oldOut.calibration) {
    reasons.push(`the old engine rendered a full reading at confidence ${entry.confidence}; the new one abstains (${state.availability}) and says why`);
    return { classification: "intentional improvement", reasons };
  }

  // The old engine's fortune register — the course tail — has no counterpart,
  // deliberately: B-020 recorded it as the layer that carries wealth, rank and
  // longevity claims.
  if (oldOut.calibration && state.availability === "abstained_calibrating") {
    return { classification: "expected architectural difference", reasons: ["both engines withhold during calibration; the new one names the reason as a stage rather than a story"] };
  }

  if (state.availability === "read") {
    const expressed = READING_AFFECTING.filter((f) => ENGINE_EXPRESSES_OLD.has(f));
    reasons.push(`the old passage varies with ${expressed.join(", ")} only; the new reading also carries ${READING_AFFECTING.filter((f) => !ENGINE_EXPRESSES_OLD.has(f)).join(", ")}`);
    return { classification: "expected architectural difference", reasons };
  }

  return { classification: "needs review", reasons: ["divergence did not match any declared rule"] };
}

/**
 * Dimensions the passage engine is structurally able to see.
 *
 * The legacy passage's variant is now occurrence-indexed from the real
 * preceding history. That gives it a bounded, honest history signal as well
 * as its direct colour/band/course dimensions; it still does not see the
 * Reflection Engine's confidence, trajectory, heritage, or availability
 * state.
 */
export const ENGINE_EXPRESSES_OLD = new Set([
  "ascendant", "magnitudeBand", "direction", "historyStage",
]);

/* ── question 3: dimension sensitivity, measured not assumed ─────────────── */

/*
 * PERTURBERS.
 *
 * Each entry produces a BEFORE and an AFTER record from one real case, so a
 * dimension can be exercised even when the case as sampled does not happen to
 * sit where that dimension varies. The first version perturbed the after side
 * only, and `magnitudeBand` came out untested: raising the magnitude of a
 * "ping" reading cannot move the band, because nothing rose. The measure
 * reported that as inertness when it was an untestable pair.
 *
 * A transformer returns null to decline a case it cannot exercise honestly —
 * declining is recorded as "not applicable", never as a pass.
 */
/* A record still in calibration has no compass; perturbing it must not throw. */
const compassOf = (c) => (c.record.compass || { ascendant: "ping", magnitude: 0, band: null, z: {} });

const withCompass = (c, patch) => ({
  ...c,
  record: { ...c.record, readingState: "read", compass: { ...compassOf(c), ...patch } },
});

const needsBaseline = (c) => (c.historyLength >= 8 ? c : null);

const PERTURB = {
  ascendant: {
    before: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "chi", magnitude: 2.0, z: { a: 2.0 } }) : null),
    after: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "huang", magnitude: 2.0, z: { b: 2.0 } }) : null),
  },
  magnitudeBand: {
    before: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "chi", magnitude: 1.2, z: { a: 1.2 } }) : null),
    after: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "chi", magnitude: 3.5, z: { a: 3.5 } }) : null),
  },
  direction: {
    before: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "chi", magnitude: 2.0, z: { a: 2.0, b: 1.5 } }) : null),
    after: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "chi", magnitude: 2.0, z: { a: 2.0, b: -1.5 } }) : null),
  },
  region: {
    before: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "chi", magnitude: 2.0, z: { a: 2.0, L: -2.4, periorbitalL: 0.2 } }) : null),
    after: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "chi", magnitude: 2.0, z: { a: 2.0, L: 0.2, periorbitalL: -2.9 } }) : null),
  },
  confidenceBand: {
    before: (c) => ({ ...c, record: { ...c.record, confidence: 0.95 } }),
    after: (c) => ({ ...c, record: { ...c.record, confidence: 0.75 } }),
  },
  historyStage: {
    before: (c) => (c.history.length >= 12 ? c : null),
    after: (c) => (c.history.length >= 12 ? { ...c, history: c.history.slice(0, 5) } : null),
  },
  trajectory: {
    before: (c) => (needsBaseline(c) ? withCompass(c, { ascendant: "chi", magnitude: 2.0, z: { a: 2.0 } }) : null),
    after: (c) => {
      const base = needsBaseline(c) && withCompass(c, { ascendant: "chi", magnitude: 2.0, z: { a: 2.0 } });
      if (!base) return null;
      return {
        ...base,
        history: base.history.map((r, i) => (i >= base.history.length - 2
          ? { ...r, compass: { ascendant: "chi", magnitude: 2.4, band: "clear", z: {} } }
          : r)),
      };
    },
  },
  heritageConstruct: {
    before: (c) => ({ ...c, record: { ...c.record, canonicalDay: dayString(0) } }),
    after: (c) => ({ ...c, record: { ...c.record, canonicalDay: dayString(1) } }),
  },
  sourceLineage: {
    // Constructs cycle every six days and the lineage alternates on the cycle,
    // so two Four Rivers days six apart are the same construct read through the
    // two competing transmissions. That pair is the only way to exercise this.
    before: (c) => ({ ...c, record: { ...c.record, canonicalDay: dayString(fourRiversDay(0)) } }),
    after: (c) => ({ ...c, record: { ...c.record, canonicalDay: dayString(fourRiversDay(1)) } }),
  },
  availability: {
    before: (c) => (needsBaseline(c) ? { ...c, record: { ...c.record, confidence: 0.92 } } : null),
    after: (c) => (needsBaseline(c) ? { ...c, record: { ...c.record, confidence: 0.30 } } : null),
  },
};

/** The nth day on which the rotation reaches Four Rivers. */
function fourRiversDay(n) {
  let found = 0;
  for (let d = 0; d < 400; d++) {
    if (heritageRotation(dayString(d)).heritageConstruct === "fourRivers") {
      if (found === n) return d;
      found++;
    }
  }
  return 0;
}

/**
 * For each dimension, does changing it change what the user reads?
 *
 * Asked of BOTH engines on the same real records. This is the whole
 * personalisation answer, and it is a measurement rather than a claim about
 * architecture.
 */
export function dimensionSensitivity(cases) {
  /*
   * APPLICABILITY IS PART OF THE MEASUREMENT.
   *
   * The first version of this counted every perturbation as a test, and
   * reported `magnitudeBand` as inert. It is not: the sample happened to be
   * dominated by abstaining records, where a magnitude cannot move the reading
   * because the reading makes no movement claim — which is the correct
   * behaviour, scored as a defect.
   *
   * So a perturbation only counts when it actually changes the interpreted
   * state. That turns the measure into the exact question worth asking: when a
   * real record's state changes in this dimension, does what the user reads
   * change? A dimension inert across every APPLICABLE record is a genuine
   * failure; a dimension quiet where it does not apply is the engine working.
   */
  const out = {};
  for (const [field, pair] of Object.entries(PERTURB)) {
    let oldMoved = 0, newMoved = 0, applicable = 0, tried = 0;
    for (const c of cases) {
      const before = pair.before(c);
      const after = pair.after(c);
      if (!before || !after) continue;
      const stateA = readingStateFromRecord(before.record, before.history);
      const stateB = readingStateFromRecord(after.record, after.history);
      if (!stateA || !stateB) continue;
      tried++;
      if (stateKey(stateA) === stateKey(stateB)) continue; // the dimension did not move
      applicable++;

      const oldA = oldReading(before.record, before.history).text;
      const oldB = oldReading(after.record, after.history).text;
      const newA = reflectionFor(before.record, before.history);
      const newB = reflectionFor(after.record, after.history);
      if (oldA !== oldB) oldMoved++;
      if (newA.composed.text !== newB.composed.text) newMoved++;
    }
    out[field] = {
      tried, applicable, oldMoved, newMoved,
      oldExpresses: applicable ? oldMoved / applicable : 0,
      newExpresses: applicable ? newMoved / applicable : 0,
    };
  }
  return out;
}

/* ── the report ──────────────────────────────────────────────────────────── */

export function runParity() {
  const cases = buildCorpus();
  const entries = [];

  for (const c of cases) {
    const oldOut = oldReading(c.record, c.history);
    const fresh = reflectionFor(c.record, c.history);
    const state = fresh ? fresh.state : null;
    const next = {
      renderable: Boolean(fresh && fresh.composed.text),
      text: fresh ? fresh.composed.text : "",
      traceLength: fresh ? fresh.composed.trace.length : 0,
      /*
       * An abstention that still narrates a measurement is not an abstention.
       * The collision suite guards this at the component level; parity has to
       * see it too, because "less abstention-aware than the old engine" is one
       * of the four questions and it cannot be answered by counting decisions
       * alone — the decision can be right while the prose contradicts it.
       */
      measurementProseWhileAbstaining: Boolean(fresh && state && state.availability !== "read"
        && fresh.composed.parts.some((pt) => pt.id === "observation" || pt.id === "magnitude")),
      layers: fresh ? Object.keys(fresh.composed.layers).filter((l) => fresh.composed.layers[l].length) : [],
    };
    const oldClaims = claimProfile(oldOut.text);
    const newClaims = claimProfile(next.text);
    const entry = { ...c, state, old: oldOut, next, oldClaims, newClaims,
      diverged: oldOut.text !== next.text };
    const { classification, reasons } = entry.diverged
      ? classify(entry)
      : { classification: "expected architectural difference", reasons: ["identical output"] };
    entries.push({ ...entry, classification, reasons });
  }

  const byClass = {};
  for (const cls of CLASSES) byClass[cls] = entries.filter((e) => e.classification === cls).length;

  const coverage = {
    total: entries.length,
    oldRenderable: entries.filter((e) => e.old.renderable).length,
    newRenderable: entries.filter((e) => e.next.renderable).length,
    unhandled: entries.filter((e) => e.old.renderable && !e.next.renderable).map((e) => e.id),
    unreachableStates: entries.filter((e) => e.state && !isReachable(e.state)).map((e) => e.id),
  };

  const preservation = {
    // Every dimension the OLD engine could express must still be expressed.
    oldDimensionsKept: [...ENGINE_EXPRESSES_OLD],
    lostInformation: entries.filter((e) => e.state && e.state.availability === "read"
      && e.old.renderable && !e.old.calibration
      && e.next.text.length < e.old.text.length * 0.6).map((e) => e.id),
    traceComplete: entries.filter((e) => e.next.renderable && e.next.traceLength >= 4).length,
    traceIncomplete: entries.filter((e) => e.next.renderable && e.next.traceLength < 4).map((e) => e.id),
  };

  const safety = {
    newBannedStems: entries.filter((e) => e.newClaims.banned && !e.oldClaims.banned).map((e) => e.id),
    moreAssertive: entries.filter((e) => e.newClaims.assertive > e.oldClaims.assertive).map((e) => e.id),
    newFutureClaims: entries.filter((e) => e.newClaims.secondPersonFuture && !e.oldClaims.secondPersonFuture).map((e) => e.id),
    oldAssertedWhereNewAbstains: entries.filter((e) => e.state && e.state.availability !== "read" && !e.old.calibration).length,
    newAssertedWhereOldAbstained: entries.filter((e) => e.old.calibration && e.state && e.state.availability === "read").map((e) => e.id),
    abstainedButNarrated: entries.filter((e) => e.next.measurementProseWhileAbstaining).map((e) => e.id),
    hedgeDelta: entries.reduce((n, e) => n + (e.newClaims.hedges - e.oldClaims.hedges), 0) / entries.length,
  };

  const personalisation = dimensionSensitivity(cases.filter((_, i) => i % 3 === 0));
  const exposure = repeatExposure();

  const gates = migrationGates({ coverage, preservation, safety, personalisation, exposure, byClass });

  return { entries, byClass, coverage, preservation, safety, personalisation, exposure, gates };
}

/** The owner's hard criteria. Each is pass/fail with the measured value. */
export function migrationGates({ coverage, preservation, safety, personalisation, exposure, byClass }) {
  const inertDimensions = Object.entries(personalisation)
    .filter(([, v]) => v.applicable > 0 && v.newExpresses < 1).map(([f]) => f);
  // A dimension the corpus never managed to move is untested, not proven.
  const unexercised = Object.entries(personalisation)
    .filter(([, v]) => v.applicable === 0).map(([f]) => f);

  return [
    { id: "unhandled-records", label: "zero unhandled real-record states",
      pass: coverage.unhandled.length === 0 && coverage.unreachableStates.length === 0,
      measured: `${coverage.unhandled.length} unhandled, ${coverage.unreachableStates.length} unreachable` },
    { id: "state-collapse", label: "zero unexplained state collapse",
      pass: byClass["needs review"] === 0,
      measured: `${byClass["needs review"]} divergences unclassified` },
    { id: "claims", label: "zero new claim/safety violations",
      pass: safety.newBannedStems.length === 0 && safety.moreAssertive.length === 0 && safety.newFutureClaims.length === 0,
      measured: `${safety.newBannedStems.length} stems, ${safety.moreAssertive.length} assertive, ${safety.newFutureClaims.length} future` },
    { id: "trace", label: "zero missing trace fields",
      pass: preservation.traceIncomplete.length === 0,
      measured: `${preservation.traceIncomplete.length} records with a thin trace` },
    { id: "abstention", label: "no regression in abstention behaviour",
      pass: safety.newAssertedWhereOldAbstained.length === 0 && safety.abstainedButNarrated.length === 0,
      measured: `${safety.newAssertedWhereOldAbstained.length} asserting where the old withheld; ${safety.abstainedButNarrated.length} abstaining while narrating a measurement` },
    { id: "inert", label: "no production-path dimension declared reading-affecting but inert",
      pass: inertDimensions.length === 0 && unexercised.length === 0,
      measured: [
        inertDimensions.length ? `inert: ${inertDimensions.join(", ")}` : "none inert",
        unexercised.length ? `never exercised: ${unexercised.join(", ")}` : "all exercised",
      ].join("; ") },
    { id: "exposure", label: "representative 30/90/365-day repeat-exposure analysis",
      pass: [30, 90, 365].every((n) => exposure[n] && exposure[n].next.days === n),
      measured: [30, 90, 365].map((n) => `${n}d: ${exposure[n].next.distinctTexts} distinct`).join("; ") },
    { id: "near-duplicate", label: "near-duplicate rate within the agreed threshold",
      pass: exposure[365].next.nearDuplicateRate <= 0.10,
      measured: `${(exposure[365].next.nearDuplicateRate * 100).toFixed(1)}% of distinct 365-day pairs above 0.9 similarity` },
    /*
     * NOT ONE OF THE OWNER'S EIGHT, AND IT SHOULD HAVE BEEN.
     *
     * The eight criteria measure correctness, safety and traceability, and the
     * engine passes all of them. They do not measure whether the product is
     * worth opening on day 200, which is what §1 and MARKER 2 actually promise.
     *
     * Seeding the Reflection Engine from the state key makes equivalent states
     * stable, while the compatibility passage engine now uses a real preceding
     * occurrence to choose among equivalent presentations. Both paths are
     * deterministic; neither uses a wall-clock date as decorative novelty.
     *
     * Threshold set at the old engine's own measured rate: whatever else
     * changes, a returning user must not meet MORE repetition than today.
     */
    { id: "repeat-exposure", label: "verbatim repetition no worse than the engine being replaced",
      pass: exposure[365].next.verbatimRepeatRate <= exposure[365].old.verbatimRepeatRate,
      measured: `365d verbatim repeat ${(exposure[365].next.verbatimRepeatRate * 100).toFixed(1)}% new vs ${(exposure[365].old.verbatimRepeatRate * 100).toFixed(1)}% old` },
    { id: "regressions", label: "zero regressions in the divergence classification",
      pass: byClass.regression === 0,
      measured: `${byClass.regression} regressions` },
  ];
}

/*
 * BLOCKERS KNOWN AND ACCEPTED, WITH A NAMED REASON AND A NAMED FIX.
 *
 * A red build for a known, tracked, unfixed problem trains people to ignore red
 * builds. A green build that hides one is worse. So the failing set is pinned:
 * this exact list may fail, nothing else may, and fixing one of these makes the
 * build fail until it is removed from here — which is the only way a blocker
 * gets closed rather than forgotten.
 */
export const KNOWN_BLOCKERS = Object.freeze([
  /*
   * CLEARED 17 August 2026 — repeat-exposure.
   *
   * The occurrence-indexed variation layer took the 365-day verbatim-repeat
   * rate from 69.0% to 0.0%, against the passage engine's 26.8%. It is removed
   * from this list rather than marked resolved, because the gate test asserts
   * the failing set EQUALS this list: a blocker that starts passing must be
   * deleted here or the build stays red. That is the mechanism that stops a
   * closed blocker living on as furniture.
   */
]);

/* ── the written report ──────────────────────────────────────────────────── */

export function renderReport(r) {
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  const L = [];
  L.push("# Reflection Engine — parity evidence and migration gate");
  L.push("");
  L.push("Generated by `scripts/parity.mjs`. Re-run it; do not edit it by hand.");
  L.push("Enforced by `tests/qise/reading-parity.test.js`, which fails the build if the");
  L.push("set of failing gates changes in either direction.");
  L.push("");
  L.push(`Corpus: **${r.coverage.total} records** built through the real capture arithmetic —`);
  L.push("painted faces, real ROI reads, real Lab conversion, real metrics, real");
  L.push("`interpretReading` — across six skin measurements, four history lengths, four");
  L.push("confidences, six rotation days and two capture classes.");
  L.push("");
  L.push("Parity is **not** measured by string equality. The new engine is meant to say");
  L.push("more. It is measured by coverage, information loss, dimension expression,");
  L.push("claim profile and traceability.");
  L.push("");
  L.push("## Migration gates");
  L.push("");
  L.push("| | Gate | Measured |");
  L.push("|---|---|---|");
  for (const g of r.gates) L.push(`| ${g.pass ? "PASS" : "**FAIL**"} | ${g.label} | ${g.measured} |`);
  L.push("");
  L.push("## 1. Coverage");
  L.push("");
  L.push(`Old engine rendered ${r.coverage.oldRenderable} of ${r.coverage.total}.`);
  L.push(`New engine rendered ${r.coverage.newRenderable} of ${r.coverage.total}.`);
  L.push(`Unhandled: ${r.coverage.unhandled.length}. States outside the swept space: ${r.coverage.unreachableStates.length}.`);
  L.push("");
  L.push("## 2. Divergence classification");
  L.push("");
  L.push("| Class | Records |");
  L.push("|---|---|");
  for (const [k, v] of Object.entries(r.byClass)) L.push(`| ${k} | ${v} |`);
  L.push("");
  L.push("## 3. Personalisation — dimension expression on real records");
  L.push("");
  L.push("A perturbation counts only where it actually moves the interpreted state.");
  L.push("");
  L.push("| Dimension | Applicable pairs | Passage engine | Reflection engine |");
  L.push("|---|---|---|---|");
  for (const [f, v] of Object.entries(r.personalisation)) {
    L.push(`| ${f} | ${v.applicable} | ${pct(v.oldExpresses)} | ${pct(v.newExpresses)} |`);
  }
  L.push("");
  L.push("## 4. Safety");
  L.push("");
  L.push(`New clinical vocabulary: ${r.safety.newBannedStems.length}.`);
  L.push(`More assertive than the old reading: ${r.safety.moreAssertive.length}.`);
  L.push(`New claims about the future: ${r.safety.newFutureClaims.length}.`);
  L.push(`Records where the old engine asserted and the new one abstains: **${r.safety.oldAssertedWhereNewAbstains}**.`);
  L.push(`Records where the new engine asserts and the old withheld: ${r.safety.newAssertedWhereOldAbstained.length}.`);
  L.push(`Mean change in hedging language per reading: ${r.safety.hedgeDelta.toFixed(2)}.`);
  L.push("");
  L.push("## 5. Repeat exposure");
  L.push("");
  L.push("| Horizon | States | Old texts | New texts | Old texts/state | New texts/state | Old verbatim repeat | New verbatim repeat |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const n of [30, 90, 365]) {
    const o = r.exposure[n].old, x = r.exposure[n].next;
    L.push(`| ${n}d | ${x.distinctStates} | ${o.distinctTexts} | ${x.distinctTexts} | ${o.textsPerState.toFixed(2)} | ${x.textsPerState.toFixed(2)} | ${pct(o.verbatimRepeatRate)} | ${pct(x.verbatimRepeatRate)} |`);
  }
  L.push("");
  L.push(`Near-duplicate rate among distinct 365-day readings: ${pct(r.exposure[365].next.nearDuplicateRate)} (threshold 10%).`);
  L.push(`Consecutive-day repeats: ${pct(r.exposure[365].next.consecutiveRepeatRate)}.`);
  L.push(`Abstention rate over the simulated year: ${pct(r.exposure[365].abstentionRate)}.`);
  L.push("");
  L.push("## Blockers");
  L.push("");
  for (const b of KNOWN_BLOCKERS) {
    L.push(`### ${b.id}${b.blocksDefault ? " — blocks default" : ""}`);
    L.push("");
    L.push(`**Why:** ${b.why}`);
    L.push("");
    L.push(`**Fix:** ${b.fix}`);
    L.push("");
  }
  return L.join("\n") + "\n";
}
