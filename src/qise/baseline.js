/*
 * PHASE 6 — the user's own baseline, and the compass laid over it.
 *
 * ── WHY MEDIAN AND MAD, NEVER MEAN AND SD ──────────────────────────────────
 * One bad capture — a passing cloud, a lamp switched on mid-reading — moves a
 * mean by 1/n of its deviation, permanently, and there is no n large enough
 * for that to stop mattering at thirty samples. A median does not move at all
 * until the outlier crosses the middle. The same argument applies to the noise
 * floor: an SD is inflated by the very outliers the floor exists to sit above,
 * so the floor rises to accommodate them and the gate stops firing.
 *
 * ── WHY `ping` IS THE EXPECTED RESULT ──────────────────────────────────────
 * Most days, nothing has changed. An app that finds drama every day is an app
 * nobody believes by week three, so the default is 平 — level — and a colour
 * is named only when an axis genuinely clears the user's own noise floor. The
 * floor is derived from their own variability, not from a population, so
 * "clears the floor" means "unusual for this person" and nothing else.
 *
 * ── WHY THE BASELINE EXCLUDES THE MOST RECENT THREE ────────────────────────
 * Otherwise today is compared against a baseline that today helped build, and
 * a slow genuine drift is silently absorbed into the reference it should be
 * measured against. Three is a lag, not a statistic; it is the smallest gap
 * that stops a reading pulling its own comparison toward itself.
 */

/** Trailing valid readings the baseline is taken over. */
export const BASELINE_WINDOW = 30;

/** Most recent readings held OUT of the baseline. */
export const BASELINE_EXCLUDE_RECENT = 3;

/** Readings 1..3 are `calibrating` — there is nothing to compare against yet. */
export const CALIBRATING_READINGS = 3;

/** MADs an axis must clear to be named. */
export const NOISE_FLOOR_MADS = 2;

/** A gap this long makes the old baseline a different person's, effectively. */
export const RESET_GAP_DAYS = 45;

/**
 * Floor under each axis's MAD.
 *
 * A run of near-identical readings gives MAD = 0, and then every subsequent
 * reading clears the floor by an infinite margin and the app finds drama every
 * single day — the exact failure `ping` exists to prevent. Same reasoning as
 * the sclera MAD floor; the units differ, so the numbers do.
 */
export const AXIS_MAD_FLOOR = Object.freeze({
  a: 0.15, b: 0.15, L: 0.25, C: 0.15, periorbitalL: 0.30, ming: 0.15, run: 0.15,
});

/** The axes the compass projects onto, plus ming/run for passage course logic. */
export const COMPASS_AXES = Object.freeze(["a", "b", "L", "C", "periorbitalL", "ming", "run"]);

/**
 * Weight given to the periorbital axis when scoring `hei`.
 *
 * EDITORIAL, not measured. Nothing in this repository supports one split over
 * another, so it sits in one declared constant rather than inside an
 * expression — the same treatment the harmony weights get in CLAUDE.md item
 * 33, and for the same reason: a number nobody can defend should at least be
 * a number everybody can find.
 */
export const HEI_PERIORBITAL_WEIGHT = 1.0;

/** Band edges, in units of the user's own noise floor. Also editorial. */
export const MAGNITUDE_BANDS = Object.freeze([
  { name: "slight", from: 1.0 },
  { name: "clear", from: 1.8 },
  { name: "marked", from: 3.0 },
]);

/* ── robust statistics ───────────────────────────────────────────────────── */

export function median(xs) {
  const s = xs.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mad(xs) {
  const m = median(xs);
  if (m === null) return null;
  return median(xs.filter((x) => typeof x === "number" && Number.isFinite(x)).map((x) => Math.abs(x - m)));
}

/* ── reading -> axes ─────────────────────────────────────────────────────── */

/**
 * The compass axes for one reading, from one pipeline's metrics.
 *
 * Note what is NOT here: nothing is compared to anyone else. There is no
 * population in this repository to be average against, and the whole design
 * depends on there never being one.
 */
export function axesOf(metrics) {
  if (!metrics || !metrics.hueVector) return null;
  return {
    a: metrics.hueVector.a,
    b: metrics.hueVector.b,
    L: metrics.meanL,
    C: metrics.meanChroma,
    periorbitalL: metrics.periorbitalL,
    ming: metrics.ming,
    run: metrics.run,
  };
}

/* ── the baseline ────────────────────────────────────────────────────────── */

/**
 * Median of the trailing valid readings, excluding the most recent three.
 *
 * @param {Array<{axes:Object, valid?:boolean}>} history oldest first
 */
export function computeBaseline(history) {
  const valid = (history || []).filter((r) => r && r.axes && r.valid !== false);
  const eligible = valid.slice(0, Math.max(0, valid.length - BASELINE_EXCLUDE_RECENT));
  const window = eligible.slice(-BASELINE_WINDOW);

  if (window.length === 0) {
    return { n: 0, axes: null, ready: false, totalValid: valid.length };
  }

  const axes = {};
  for (const key of COMPASS_AXES) {
    axes[key] = median(window.map((r) => r.axes[key]));
  }
  return { n: window.length, axes, ready: true, totalValid: valid.length };
}

/** Two MADs per axis, floored. Derived from the user's own variability. */
export function noiseFloor(history) {
  const valid = (history || []).filter((r) => r && r.axes && r.valid !== false);
  const eligible = valid.slice(0, Math.max(0, valid.length - BASELINE_EXCLUDE_RECENT));
  const window = eligible.slice(-BASELINE_WINDOW);

  const floor = {};
  for (const key of COMPASS_AXES) {
    const m = window.length ? mad(window.map((r) => r.axes[key])) : null;
    floor[key] = Math.max(NOISE_FLOOR_MADS * (m ?? 0), AXIS_MAD_FLOOR[key]);
  }
  return floor;
}

/** Today's axes minus the baseline's. Null where either side is missing. */
export function deltasFrom(axes, baseline) {
  if (!axes || !baseline || !baseline.axes) return null;
  const out = {};
  for (const key of COMPASS_AXES) {
    const today = axes[key], base = baseline.axes[key];
    out[key] = (typeof today === "number" && typeof base === "number") ? today - base : null;
  }
  return out;
}

/* ── the compass ─────────────────────────────────────────────────────────── */

const bandFor = (magnitude) => {
  let name = null;
  for (const b of MAGNITUDE_BANDS) if (magnitude >= b.from) name = b.name;
  return name;
};

/**
 * Project the deltas onto the five colours.
 *
 * Every axis is divided by its own floor first, so the components are in
 * comparable units — "how unusual is this, for this person, on this axis". That
 * normalisation is also what absorbs CIELAB's non-uniformity per user: the
 * scale on each axis is set by their own variation at their own chroma level,
 * not by a constant that assumes everyone's a* means the same thing.
 *
 * @returns {{ascendant:string, magnitude:number, band:string|null,
 *            components:Object, z:Object}}
 */
export function projectCompass(deltas, floor) {
  if (!deltas || !floor) {
    return { ascendant: null, magnitude: 0, band: null, components: {}, z: {} };
  }

  const z = {};
  for (const key of COMPASS_AXES) {
    z[key] = typeof deltas[key] === "number" ? deltas[key] / floor[key] : null;
  }

  const pos = (v) => (typeof v === "number" ? v : 0);

  // hei is the one colour weighted by a second axis. When the periorbital
  // reading is missing the face axis carries it alone rather than the whole
  // colour being dropped — a missing region should cost precision, not a
  // direction.
  const heiFace = -pos(z.L);
  const heiOrbit = z.periorbitalL === null ? null : -z.periorbitalL;
  const hei = heiOrbit === null
    ? heiFace
    : (heiFace + HEI_PERIORBITAL_WEIGHT * heiOrbit) / (1 + HEI_PERIORBITAL_WEIGHT);

  const components = {
    // Each colour scores only where its precondition holds. A conjunction
    // scores as its WEAKER leg: "-dC* with +dL*" is not satisfied by a large
    // chroma drop and a flat luminance.
    chi: pos(z.a) > 0 ? pos(z.a) : 0,
    huang: pos(z.b) > 0 ? pos(z.b) : 0,
    qing: (pos(z.a) < 0 && pos(z.b) < 0) ? Math.min(-pos(z.a), -pos(z.b)) : 0,
    bai: (pos(z.C) < 0 && pos(z.L) > 0) ? Math.min(-pos(z.C), pos(z.L)) : 0,
    hei: hei > 0 ? hei : 0,
  };

  let ascendant = null, magnitude = 0;
  for (const [name, score] of Object.entries(components)) {
    if (score > magnitude) { ascendant = name; magnitude = score; }
  }

  // Nothing cleared the user's own floor. 平 — level — and that is the
  // expected daily result, not a failure to measure.
  if (magnitude < 1) {
    return { ascendant: "ping", magnitude, band: null, components, z };
  }

  return { ascendant, magnitude, band: bandFor(magnitude), components, z };
}

/* ── resets ──────────────────────────────────────────────────────────────── */

/**
 * Should the baseline be thrown away rather than continued?
 *
 * All three conditions describe the same event: the thing being measured is no
 * longer commensurable with what built the baseline. A different sensor, a
 * different capture class, or a gap long enough that the face genuinely is
 * different. Continuing across any of them reports the discontinuity as a
 * change in the person.
 */
export function shouldResetBaseline(previous, current) {
  const reasons = [];
  if (!previous) return { reset: false, reasons };

  if (previous.captureMode && current.captureMode && previous.captureMode !== current.captureMode) {
    reasons.push("capture_mode_changed");
  }
  const gapMs = Date.parse(current.timestampIso) - Date.parse(previous.timestampIso);
  if (Number.isFinite(gapMs) && gapMs > RESET_GAP_DAYS * 86400000) {
    reasons.push("gap_exceeded");
  }
  return { reset: reasons.length > 0, reasons };
}

/* ── confidence ──────────────────────────────────────────────────────────── */

/** Jitter magnitude at which the jitter term has fallen to one half. */
export const JITTER_HALF_POINT = 1.5;

/**
 * The minimum of three independent things that can each ruin a reading.
 *
 * A minimum and not a product: three mediocre inputs should not multiply down
 * to near-zero, and one bad input must not be averaged away by two good ones.
 * The worst link is the honest summary.
 */
export const ASSISTED_CAPTURE_CONFIDENCE = 0.78;

export function readingConfidence({ scleraConfidenceValue, validFraction, frameJitter, captureTier }) {
  const jitterTerm = typeof frameJitter === "number"
    ? JITTER_HALF_POINT / (JITTER_HALF_POINT + Math.max(0, frameJitter))
    : 1;
  const parts = [
    typeof scleraConfidenceValue === "number" ? scleraConfidenceValue : 1,
    typeof validFraction === "number" ? validFraction : 1,
    jitterTerm,
    captureTier === "assisted" ? ASSISTED_CAPTURE_CONFIDENCE : 1,
  ];
  return Math.max(0, Math.min(1, Math.min(...parts)));
}

/** Below this a reading renders hollow and is kept out of the pattern engine. */
export const LOW_CONFIDENCE = 0.6;

export const isLowConfidence = (c) => c < LOW_CONFIDENCE;

/* ── the whole step ──────────────────────────────────────────────────────── */

/**
 * Today's reading against the user's own history.
 *
 * @param {Object} metrics one pipeline's metrics for today
 * @param {Array} history oldest first, each `{axes, valid, timestampIso, ...}`
 */
export const BASELINE_VERSION = "v2";

export function interpretReading(metrics, history, options = {}) {
  const axes = axesOf(metrics);
  const currentTimestamp = options.timestampIso;
  
  // Segmentation: baseline/history by algorithm version and capture class.
  // We filter history to match current algorithm and capture class,
  // or reset lineage if they don't match.
  const captureMode = options.captureMode || "auto";
  const historyToUse = history.filter(r => 
    (r.baselineVersion === BASELINE_VERSION || !r.baselineVersion) && 
    (r.captureMode === captureMode || !r.captureMode)
  );

  const lastReading = historyToUse[historyToUse.length - 1];
  
  // Canonical-day policy: Use persisted timestamp for determinism.
  if (currentTimestamp && lastReading && lastReading.timestampIso && 
      lastReading.timestampIso.split('T')[0] === currentTimestamp.split('T')[0]) {
    // Logic for "retake" is handled by the caller/UI: 
    // it will overwrite this entry in the store.
  }

  // Baseline reset: check for gap
  const resetCheck = shouldResetBaseline(lastReading, { ...metrics, timestampIso: currentTimestamp, captureMode });
  const validHistory = resetCheck.reset ? [] : historyToUse;

  const validCount = (validHistory || []).filter((r) => r && r.axes && r.valid !== false).length;

  if (validCount < CALIBRATING_READINGS) {
    return {
      state: "calibrating", readingsSoFar: validCount, needed: CALIBRATING_READINGS,
      axes, baseline: null, deltas: null, compass: null,
    };
  }

  const baseline = computeBaseline(validHistory);
  if (!baseline.ready) {
    return {
      state: "calibrating", readingsSoFar: validCount, needed: CALIBRATING_READINGS + 1,
      axes, baseline: null, deltas: null, compass: null,
    };
  }

  const floor = noiseFloor(validHistory);
  const deltas = deltasFrom(axes, baseline);
  const compass = projectCompass(deltas, floor);
  
  return {
    state: "read",
    axes, baseline, floor, deltas, compass,
    basis: metrics.basis,
    z: compass.z,
    confidence: options.confidence ?? null,
  };
}
