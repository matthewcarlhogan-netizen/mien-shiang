/*
 * A five-colour visual composition for every reading, including day one.
 *
 * Before a personal baseline exists this is an impression of the measured
 * capture only. It is not a judgement and is never compared with another
 * person. Once the personal baseline exists, the same visual switches to the
 * reading's relative compass components and names that basis explicitly.
 */

export const COMPOSITION_COLOURS = Object.freeze(["chi", "huang", "qing", "bai", "hei"]);

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function normalise(values) {
  const safe = Object.fromEntries(COMPOSITION_COLOURS.map((key) => [key, Math.max(0, finite(values[key]))]));
  const total = Object.values(safe).reduce((sum, value) => sum + value, 0) || COMPOSITION_COLOURS.length;
  const segments = {};
  let used = 0;
  COMPOSITION_COLOURS.forEach((key, index) => {
    const value = index === COMPOSITION_COLOURS.length - 1
      ? Math.max(0, 100 - used)
      : Math.floor((safe[key] / total) * 1000) / 10;
    segments[key] = value;
    used += value;
  });
  return segments;
}

const ordered = (segments) => Object.entries(segments)
  .sort((a, b) => b[1] - a[1] || COMPOSITION_COLOURS.indexOf(a[0]) - COMPOSITION_COLOURS.indexOf(b[0]));

export function compositionOf(reading) {
  const persisted = reading?.composition;
  if (persisted?.segments && COMPOSITION_COLOURS.every((key) => Number.isFinite(persisted.segments[key]))) {
    const segments = normalise(persisted.segments);
    const order = ordered(segments);
    return {
      basis: persisted.basis === "personal-shift" ? "personal-shift" : "capture-impression",
      segments,
      lead: order[0][0],
      support: order[1][0],
    };
  }

  const compass = reading?.compass;
  const compassValues = compass?.components || {};
  const compassTotal = COMPOSITION_COLOURS.reduce((sum, key) => sum + Math.max(0, finite(compassValues[key])), 0);
  if (compassTotal > 0 && compass?.ascendant) {
    const segments = normalise(compassValues);
    const order = ordered(segments);
    return { basis: "personal-shift", segments, lead: order[0][0], support: order[1][0] };
  }

  const metrics = reading?.metrics?.corrected || reading?.metrics?.raw || {};
  const a = finite(metrics?.hueVector?.a);
  const b = finite(metrics?.hueVector?.b);
  const L = finite(metrics.meanL, 50);
  const C = finite(metrics.meanChroma, Math.hypot(a, b));
  const orbit = finite(metrics.periorbitalL, L);

  // Small bases keep every colour visible. The remaining terms are simply a
  // visual projection of Lab axes; they do not encode a classical verdict.
  const segments = normalise({
    chi: 1 + Math.max(0, a),
    huang: 1 + Math.max(0, b),
    qing: 1 + Math.max(0, -a) + Math.max(0, -b) * 0.6,
    bai: 1 + Math.max(0, L - 52) * 0.45 + Math.max(0, 13 - C) * 0.35,
    hei: 1 + Math.max(0, 52 - L) * 0.45 + Math.max(0, L - orbit) * 0.25,
  });
  const order = ordered(segments);
  return { basis: "capture-impression", segments, lead: order[0][0], support: order[1][0] };
}
