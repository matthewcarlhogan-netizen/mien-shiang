#!/usr/bin/env node
/*
 * PHASE 5b — the sclera bake-off.
 *
 * ── WHAT THIS SETTLES, AND WHY IT IS A SCRIPT AND NOT AN ARGUMENT ──────────
 * The stress test of v1 recommended deleting sclera correction entirely, on
 * the grounds that a non-diagonal ISP Colour Correction Matrix and
 * spatially-variant Local Tone Mapping make a diagonal correction
 * mathematically invalid. That recommendation is REJECTED AS STATED, for two
 * reasons, and then settled by measurement rather than by either of them.
 *
 * 1. The CCM objection is technically right and practically weak. The CCM is a
 *    fixed, device-specific linear transform. A diagonal correction applied
 *    afterwards is not an exact inverse, but the residual error is systematic
 *    and device-constant -- and this whole architecture reports deltas against
 *    the user's own baseline on their own device, where a device-constant bias
 *    cancels.
 *
 * 2. The proposed alternative -- "let the 30-day median absorb lighting
 *    changes" -- does not work, and the reason is a category error. A median
 *    reduces bias in the BASELINE. It does nothing whatever to the variance of
 *    any INDIVIDUAL reading. If per-reading illuminant variance is several dE
 *    and the physiological signal is around 2 dE, then every single daily
 *    reading is noise no matter how well the baseline is estimated. That
 *    breaks the daily-reading product outright rather than simplifying it.
 *
 * The LTM objection is the serious one, and it is testable, so it gets tested.
 * Worth noting that the aggressive computational-photography stacks usually
 * cited -- Deep Fusion, HDR+ -- are STILL-capture pipelines; a getUserMedia
 * video track typically traverses a lighter path. Do not assume either way.
 * Measure.
 *
 * ── THE PROTOCOL ───────────────────────────────────────────────────────────
 * 5 readings in each of 4 lighting settings (daylight window, warm indoor
 * lamp, cool LED, mixed) inside a 30-minute window. Physiology is effectively
 * constant over half an hour, so ALL observed variance is optical noise. That
 * is what makes between-setting spread interpretable at all.
 *
 * ── THE DECISION RULE, EXECUTED RATHER THAN ARGUED ─────────────────────────
 * Ship whichever pipeline has the lower BETWEEN-SETTING spread on `hueVector`
 * and `run`. If corrected wins by less than 25%, ship raw: the simpler
 * pipeline wins ties, and the sclera dependency carries both a
 * physiological-volatility risk and unassessed patent exposure.
 *
 * Usage:
 *   node scripts/qise-bakeoff.mjs <readings.json>
 *   node scripts/qise-bakeoff.mjs --self-test
 *
 * The input is the export produced by store.js `exportAll()`, filtered to the
 * bake-off session. Every reading must carry a `lightingSetting` tag.
 */
import { readFileSync } from "node:fs";

export const MARGIN_TO_BEAT = 0.25;
export const DECIDING_METRICS = ["hueVector", "run"];
export const REQUIRED_SETTINGS = 4;
export const READINGS_PER_SETTING = 5;

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function sd(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/**
 * Reduce a metric to a scalar so two pipelines can be compared on it.
 *
 * `hueVector` is a two-vector, so its "spread" is the spread of the POINTS,
 * not of the two components independently: taking SD of a* and SD of b* and
 * adding them would count a diagonal shift twice and a purely-a* shift once.
 * The scalar used is the distance from the centroid.
 */
export function spreadOf(metricName, values) {
  if (metricName === "hueVector") {
    const as = values.map((v) => v.a), bs = values.map((v) => v.b);
    const ca = mean(as), cb = mean(bs);
    const radii = values.map((v) => Math.hypot(v.a - ca, v.b - cb));
    return mean(radii);
  }
  return sd(values);
}

/** Group readings by their lighting setting tag. */
function bySetting(readings) {
  const groups = new Map();
  for (const r of readings) {
    const key = r.lightingSetting;
    if (!key) throw new Error("every bake-off reading must carry a lightingSetting tag");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return groups;
}

const pick = (reading, pipeline, metric) => reading.metrics[pipeline][metric];

/**
 * Within-setting SD and between-setting spread, per pipeline per metric.
 *
 * Within-setting is the noise floor of the measurement itself. Between-setting
 * is what the correction is supposed to remove. A pipeline can only be said to
 * win if it moves the second without inflating the first.
 */
export function analyse(readings) {
  const groups = bySetting(readings);
  const settings = [...groups.keys()].sort();
  const table = {};

  for (const pipeline of ["raw", "corrected"]) {
    table[pipeline] = {};
    for (const metric of DECIDING_METRICS) {
      const withinBySetting = {};
      const centres = [];

      for (const setting of settings) {
        const values = groups.get(setting).map((r) => pick(r, pipeline, metric));
        withinBySetting[setting] = spreadOf(metric, values);

        centres.push(metric === "hueVector"
          ? { a: mean(values.map((v) => v.a)), b: mean(values.map((v) => v.b)) }
          : mean(values));
      }

      table[pipeline][metric] = {
        withinBySetting,
        withinMean: mean(Object.values(withinBySetting)),
        between: spreadOf(metric, centres),
      };
    }
  }
  return { settings, table };
}

/** The rule, applied. No judgement is exercised at this point. */
export function decide(table) {
  const perMetric = {};
  for (const metric of DECIDING_METRICS) {
    const raw = table.raw[metric].between;
    const corrected = table.corrected[metric].between;
    // How much of the raw pipeline's between-setting spread the correction
    // removes. Negative means it made things worse.
    const improvement = raw === 0 ? 0 : (raw - corrected) / raw;
    perMetric[metric] = { raw, corrected, improvement, clears: improvement >= MARGIN_TO_BEAT };
  }

  // BOTH deciding metrics must clear the margin. Correcting the hue while
  // inflating the chroma spread is not a win, it is a trade nobody asked for.
  const shipCorrected = DECIDING_METRICS.every((m) => perMetric[m].clears);

  return {
    perMetric,
    pipeline: shipCorrected ? "corrected" : "raw",
    why: shipCorrected
      ? `corrected reduces between-setting spread by at least ${(MARGIN_TO_BEAT * 100).toFixed(0)}% on every deciding metric`
      : `corrected does not clear the ${(MARGIN_TO_BEAT * 100).toFixed(0)}% margin on every deciding metric, so the simpler pipeline wins the tie`,
  };
}

function validate(readings) {
  const problems = [];
  const groups = bySetting(readings);

  if (groups.size < REQUIRED_SETTINGS) {
    problems.push(`${groups.size} lighting settings, protocol requires ${REQUIRED_SETTINGS}`);
  }
  for (const [setting, rs] of groups) {
    if (rs.length < READINGS_PER_SETTING) {
      problems.push(`"${setting}" has ${rs.length} readings, protocol requires ${READINGS_PER_SETTING}`);
    }
  }

  // The 30-minute window is what licenses "all observed variance is optical".
  const times = readings.map((r) => Date.parse(r.timestampIso)).filter((t) => !Number.isNaN(t));
  if (times.length === readings.length && times.length > 1) {
    const spanMin = (Math.max(...times) - Math.min(...times)) / 60000;
    if (spanMin > 30) {
      problems.push(`readings span ${spanMin.toFixed(0)} minutes; past 30 the "physiology is constant" premise fails`);
    }
  }
  return problems;
}

export function report(readings) {
  const problems = validate(readings);
  const { settings, table } = analyse(readings);
  const decision = decide(table);

  const lines = [];
  lines.push(`Qi Se sclera bake-off — ${readings.length} readings across ${settings.length} lighting settings`);
  lines.push(`  settings: ${settings.join(", ")}`);
  lines.push("");
  lines.push("| metric    | pipeline  | within-setting SD (mean) | between-setting spread |");
  lines.push("|-----------|-----------|--------------------------|------------------------|");
  for (const metric of DECIDING_METRICS) {
    for (const pipeline of ["raw", "corrected"]) {
      const c = table[pipeline][metric];
      lines.push(`| ${metric.padEnd(9)} | ${pipeline.padEnd(9)} | ${c.withinMean.toFixed(4).padStart(24)} | ${c.between.toFixed(4).padStart(22)} |`);
    }
  }
  lines.push("");
  for (const metric of DECIDING_METRICS) {
    const d = decision.perMetric[metric];
    lines.push(`  ${metric}: correction changes between-setting spread by ${(d.improvement * 100).toFixed(1)}% `
      + `(${d.clears ? "clears" : "does not clear"} the ${(MARGIN_TO_BEAT * 100).toFixed(0)}% margin)`);
  }
  lines.push("");
  lines.push(`DECISION: ship the ${decision.pipeline.toUpperCase()} pipeline.`);
  lines.push(`  ${decision.why}`);
  if (problems.length) {
    lines.push("");
    lines.push("PROTOCOL DEVIATIONS — the decision above is provisional until these are fixed:");
    for (const p of problems) lines.push(`  - ${p}`);
  }

  return { text: lines.join("\n"), decision, table, problems };
}

/*
 * A synthetic run, so the script itself is verifiable without a phone.
 *
 * This proves the SCRIPT works. It proves nothing at all about which pipeline
 * should ship -- the generator's illuminant model is diagonal by construction,
 * which is the very assumption the real bake-off exists to test. Anyone
 * reading a self-test decision as the architectural decision has misread it,
 * so the output says so.
 */
export function syntheticReadings({ correctionHelps = 0.9, n = READINGS_PER_SETTING } = {}) {
  const settings = ["daylight-window", "warm-lamp", "cool-led", "mixed"];
  const illuminantBias = { "daylight-window": 0, "warm-lamp": 1.8, "cool-led": -1.4, mixed: 0.7 };
  const out = [];
  let seed = 20260809;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
  const t0 = Date.parse("2026-08-09T09:00:00.000Z");

  settings.forEach((setting, si) => {
    for (let i = 0; i < n; i++) {
      const bias = illuminantBias[setting];
      const noise = () => rnd() * 0.30;
      const residual = bias * (1 - correctionHelps);
      out.push({
        timestampIso: new Date(t0 + (si * n + i) * 90000).toISOString(),
        lightingSetting: setting,
        metrics: {
          raw: { hueVector: { a: 14 + bias + noise(), b: 12 + bias * 0.6 + noise() }, run: 21 + bias * 0.5 + noise() },
          corrected: { hueVector: { a: 14 + residual + noise(), b: 12 + residual * 0.6 + noise() }, run: 21 + residual * 0.5 + noise() },
        },
      });
    }
  });
  return out;
}

function main(argv) {
  const arg = argv[2];
  if (!arg) {
    console.error("usage: node scripts/qise-bakeoff.mjs <readings.json>|--self-test");
    process.exit(2);
  }

  let readings;
  if (arg === "--self-test") {
    readings = syntheticReadings();
    console.log("SELF-TEST: synthetic data with a DIAGONAL illuminant model.");
    console.log("The decision below exercises the script. It is NOT the architectural");
    console.log("decision, because a diagonal model assumes away the LTM effect the real");
    console.log("bake-off exists to measure.\n");
  } else {
    readings = JSON.parse(readFileSync(arg, "utf8"));
    if (!Array.isArray(readings)) readings = readings.readings;
  }

  if (!Array.isArray(readings) || readings.length === 0) {
    console.error("FAIL: no readings. A bake-off that analyses nothing cannot produce a decision.");
    process.exit(1);
  }

  const { text, problems } = report(readings);
  console.log(text);
  console.log("\nRecord this table and the decision in docs/QISE_NOTES.md.");
  process.exit(problems.length && arg !== "--self-test" ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith("qise-bakeoff.mjs")) main(process.argv);
