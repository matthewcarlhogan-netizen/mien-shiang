/*
 * Experimental screen-light response check.
 *
 * This is deliberately NOT identity verification and it never decides whether
 * a reading may proceed. It asks a narrower question: did the face region in
 * the camera respond in the expected direction while this screen moved slowly
 * through a neutral, blue and green light sequence?
 *
 * The sequence stays below three changes per second, contains no saturated
 * red, and is opt-in. Raw channel observations are used only in memory; the
 * persisted result is a categorical outcome produced by publicSummary().
 */

export const ILLUMINATION_VERSION = "screen-light-v1";
export const PHASE_MS = 700;
export const SETTLE_MS = 900;

const NEUTRAL = Object.freeze({ id: "neutral", colour: "#EDE8DC", opacity: 0.58 });
const BLUE = Object.freeze({ id: "blue", colour: "#426B7A", opacity: 0.62 });
const GREEN = Object.freeze({ id: "green", colour: "#4A7267", opacity: 0.62 });

/** Build a one-time order without introducing red or a rapid strobe. */
export function illuminationSequence(orderBit = 0) {
  const colours = orderBit & 1 ? [GREEN, BLUE] : [BLUE, GREEN];
  return [
    { ...NEUTRAL, key: "neutral-start" },
    { ...colours[0], key: colours[0].id },
    { ...NEUTRAL, key: "neutral-middle" },
    { ...colours[1], key: colours[1].id },
    { ...NEUTRAL, key: "neutral-end" },
  ];
}

export function createIlluminationSession(startedAt, orderBit = 0) {
  return {
    startedAt,
    sequence: illuminationSequence(orderBit),
    samples: [],
  };
}

/** Return the current phase. The final boundary is explicit, never rounded. */
export function illuminationPhase(session, nowMs) {
  const elapsed = Math.max(0, nowMs - session.startedAt);
  const index = Math.floor(elapsed / PHASE_MS);
  if (index >= session.sequence.length) {
    return { done: true, index: session.sequence.length, phase: null };
  }
  return { done: false, index, phase: session.sequence[index] };
}

/**
 * Mean face-region RGB for one frame. Only the mean enters the short-lived
 * session; pixels and region geometry remain owned by the capture loop.
 */
export function meanFaceRgb(rois) {
  let r = 0, g = 0, b = 0, n = 0;
  for (const roi of Object.values(rois?.rois || {})) {
    if (!roi?.valid) continue;
    for (const p of roi.pixels || []) {
      r += p.r; g += p.g; b += p.b; n++;
    }
  }
  return n ? { r: r / n, g: g / n, b: b / n, n } : null;
}

export function recordIlluminationSample(session, phaseKey, rgb) {
  if (!rgb || !phaseKey) return;
  session.samples.push({ phaseKey, r: rgb.r, g: rgb.g, b: rgb.b });
}

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

function phaseChromaticity(samples, key) {
  const rows = samples.filter((sample) => sample.phaseKey === key);
  if (rows.length < 2) return null;
  const r = median(rows.map((row) => row.r));
  const g = median(rows.map((row) => row.g));
  const b = median(rows.map((row) => row.b));
  const sum = r + g + b;
  return sum > 0 ? { r: r / sum, g: g / sum, b: b / sum, frames: rows.length } : null;
}

/**
 * A directional response, not a liveness verdict. Auto white balance may erase
 * the signal, so an inconclusive result is ordinary and never blocks capture.
 */
export function summarizeIllumination(session) {
  const neutralKeys = ["neutral-start", "neutral-middle", "neutral-end"];
  const neutralParts = neutralKeys.map((key) => phaseChromaticity(session.samples, key)).filter(Boolean);
  const blue = phaseChromaticity(session.samples, "blue");
  const green = phaseChromaticity(session.samples, "green");

  if (neutralParts.length < 2 || !blue || !green) {
    return { outcome: "inconclusive", phasesRead: Number(Boolean(blue)) + Number(Boolean(green)) };
  }

  const neutral = {
    r: median(neutralParts.map((p) => p.r)),
    g: median(neutralParts.map((p) => p.g)),
    b: median(neutralParts.map((p) => p.b)),
  };
  const blueResponse = blue.b - neutral.b;
  const greenResponse = green.g - neutral.g;
  const threshold = 0.004;

  return {
    outcome: blueResponse > threshold && greenResponse > threshold
      ? "responsive"
      : "inconclusive",
    phasesRead: 2,
    // Scores remain in memory so a laboratory run can be inspected. They are
    // deliberately removed by publicIlluminationSummary before persistence.
    scores: { blue: blueResponse, green: greenResponse },
  };
}

export function publicIlluminationSummary(result, { requested = false, reason = null } = {}) {
  return {
    version: ILLUMINATION_VERSION,
    requested: Boolean(requested),
    outcome: result?.outcome || "skipped",
    phasesRead: Number.isInteger(result?.phasesRead) ? result.phasesRead : 0,
    reason: reason || null,
  };
}
