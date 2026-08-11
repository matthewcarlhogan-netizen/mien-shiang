/*
 * PHASE 9 — screen view-models. Pure; no DOM, no browser.
 *
 * The screens are built as data first and rendered second, so the ORDER of the
 * reading screen, the shape of the gauges and what the sparkline is allowed to
 * plot are all testable without a browser. Everything in here that could be
 * wrong in a way a screenshot would not reveal is a function with a test.
 */
import { PALETTE, COLOUR_ORDER } from "./palette.js";
import { sealModel, sealSvg } from "./seal.js";
import { passageFor } from "../../qise/passages.js";
import { isLowConfidence } from "../../qise/baseline.js";
import { compositionOf, COMPOSITION_COLOURS } from "../../qise/composition.js";

export const COMPOSITION_LABELS = Object.freeze({
  chi: Object.freeze({ cjk: "赤", name: "chi", note: "warm note" }),
  huang: Object.freeze({ cjk: "黃", name: "huang", note: "earth note" }),
  qing: Object.freeze({ cjk: "青", name: "qing", note: "cool note" }),
  bai: Object.freeze({ cjk: "白", name: "bai", note: "light note" }),
  hei: Object.freeze({ cjk: "黑", name: "hei", note: "deep note" }),
});

/** The reading screen, top to bottom. Asserted as a list, not as a layout. */
export const READING_SCREEN_ORDER = Object.freeze([
  "seal", "verdict", "gauges", "courts", "passage", "tags", "sparkline",
]);

/** The three courts, top to bottom, with the regions each covers. */
export const THREE_COURTS = Object.freeze([
  { key: "upper", label: "Upper court", cjk: "上停", rois: ["tian", "yintang"] },
  { key: "middle", label: "Middle court", cjk: "中停", rois: ["shangen", "zhuntou", "quan_l", "quan_r"] },
  { key: "lower", label: "Lower court", cjk: "下停", rois: ["dige"] },
]);

const quantile = (xs, q) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
};

const metricOf = (r, key) => {
  const m = r && r.metrics && (r.metrics.corrected || r.metrics.raw);
  const v = m ? m[key] : null;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

/**
 * One 明 / 潤 gauge: a shaded band for the usual range, a mark for today.
 *
 * The band is the IQR of the trailing thirty, not the full range. A full range
 * is set by its two most extreme readings, so one bad capture widens the band
 * until nothing ever looks unusual again — the gauge would then be a picture
 * of the worst day rather than of the usual ones.
 */
export function gaugeModel(history, todayValue, key, label) {
  const values = (history || []).map((r) => metricOf(r, key)).filter((v) => v !== null).slice(-30);
  if (values.length < 4 || typeof todayValue !== "number") {
    return {
      key, label, measured: false, today: todayValue ?? null, n: values.length,
      relativeLabel: "Building your personal range",
    };
  }

  const low = quantile(values, 0.25);
  const high = quantile(values, 0.75);
  const min = Math.min(...values, todayValue);
  const max = Math.max(...values, todayValue);
  const span = max - min || 1;
  const at = (v) => (v - min) / span;

  return {
    key, label, measured: true, n: values.length,
    today: todayValue,
    band: { from: at(low), to: at(high), low, high },
    mark: at(todayValue),
    outside: todayValue > high ? "above" : (todayValue < low ? "below" : null),
    relativeLabel: todayValue > high
      ? "Above your recent range"
      : (todayValue < low ? "Below your recent range" : "Within your recent range"),
  };
}

/**
 * The Three Courts strip: which regions were readable in each court.
 *
 * It reports COVERAGE, not a verdict. A court is a place on the face in this
 * tradition, and saying "the middle court read three of four regions" is a
 * statement about the photograph. Saying anything about what the middle court
 * signifies for the reader is the thing this product does not do.
 */
export function courtsStrip(roiValidity) {
  const validity = roiValidity || {};
  return THREE_COURTS.map((court) => {
    const read = court.rois.filter((r) => validity[r] === true).length;
    return {
      ...court,
      read,
      total: court.rois.length,
      complete: read === court.rois.length,
    };
  });
}

/**
 * Thirty days of one metric.
 *
 * Points carry `basis` so a consumer can refuse to join two points computed
 * over different region sets — the same trap as `glowIndex` in CLAUDE.md item
 * 18, where dropping a below-average component makes the composite go UP and
 * a chart shows a step change that is not in the person.
 */
export function sparklineModel(history, key = "ming", days = 30) {
  const recent = (history || []).slice(-days);
  const points = recent.map((r, i) => ({
    i,
    timestampIso: r.timestampIso,
    value: metricOf(r, key),
    basis: (r.metrics && (r.metrics.corrected || r.metrics.raw) || {}).basis ?? null,
    lowConfidence: typeof r.confidence === "number" ? isLowConfidence(r.confidence) : false,
  }));

  const measured = points.filter((p) => p.value !== null);
  const bases = new Set(measured.map((p) => p.basis));

  return {
    key, points, n: measured.length,
    min: measured.length ? Math.min(...measured.map((p) => p.value)) : null,
    max: measured.length ? Math.max(...measured.map((p) => p.value)) : null,
    // More than one basis in the window means the series is not a single
    // comparable line. The chart must break rather than interpolate across it.
    basisChanged: bases.size > 1,
    bases: [...bases],
  };
}

/** One sentence addressed to the reader, without turning it into a trait. */
export function verdictFor(compass) {
  const ascendant = (compass && compass.ascendant) || "ping";
  if (ascendant === "ping") return "Today, your reading is level — 平.";
  const colour = PALETTE[ascendant];
  if (!colour) return "Today, your reading is level — 平.";
  const band = compass.band ? `${compass.band} ` : "";
  return `Today, your reading shows ${band}${ascendant} — ${colour.simile.split(",")[0]}.`;
}

/**
 * A short editorial lead and a reflection prompt for each compass point.
 *
 * These are deliberately about the reading, not a claim about the reader.
 * The longer sourced passage still carries the traditional interpretation;
 * this layer gives the result a human entry point before the technical detail.
 */
export const READING_HOOKS = Object.freeze({
  chi: Object.freeze({
    title: "Something warmer is asking for attention.",
    reflection: "What deserves your energy — and what is only demanding it?",
  }),
  huang: Object.freeze({
    title: "A steadier note is coming through.",
    reflection: "Where could a slower choice create more room?",
  }),
  qing: Object.freeze({
    title: "The reading is asking for less noise.",
    reflection: "What can become simpler before the next step?",
  }),
  bai: Object.freeze({
    title: "Clarity is the note beneath this reading.",
    reflection: "What could you clear away to hear yourself better?",
  }),
  hei: Object.freeze({
    title: "A deeper, quieter note is present.",
    reflection: "What is worth protecting your energy for?",
  }),
  ping: Object.freeze({
    title: "Nothing needs to shout today.",
    reflection: "Where could steady be enough, without becoming stuck?",
  }),
});

export function hookFor(compass) {
  const ascendant = compass && READING_HOOKS[compass.ascendant]
    ? compass.ascendant
    : "ping";
  return READING_HOOKS[ascendant];
}

export function compositionStrip(reading) {
  const composition = compositionOf(reading);
  return {
    ...composition,
    items: COMPOSITION_COLOURS.map((key) => ({
      key,
      value: composition.segments[key],
      ...COMPOSITION_LABELS[key],
      colour: PALETTE[key].hex,
    })),
    leadLabel: COMPOSITION_LABELS[composition.lead],
    supportLabel: COMPOSITION_LABELS[composition.support],
  };
}

/**
 * Join the moving five-colour layer to the structural reading made from the
 * same accepted frame. The model keeps each tradition's caveats intact.
 */
export function integratedReadingModel(reading) {
  const source = reading?.integrated;
  const element = source?.fiveElements;
  const courts = source?.threeCourts;
  const palaceSource = source?.twelvePalaces;
  const harmony = source?.harmony;
  if (!source || !element?.available || !courts?.available) {
    return {
      available: false,
      note: element?.note || "This scan did not resolve enough frontal geometry for the structural reading.",
    };
  }

  const composition = compositionStrip(reading);
  const lead = composition.leadLabel;
  const courtLabel = courts.balanced
    ? "Three Courts in near-equal measure"
    : `${courts.court?.hanzi || ""} ${courts.court?.name || courts.dominant}`.trim();
  const measuredPalaces = (palaceSource?.palaces || []).filter((palace) => palace.measured);
  const harmonyComponents = (harmony?.components || []).map((component) => ({
    ...component,
    percent: Number.isFinite(component.value) ? Math.round(component.value * 100) : null,
  }));

  return {
    available: true,
    headline: `${lead.cjk} today, over ${element.hanzi} ${element.name}`,
    synthesis:
      `The changing colour layer leads with ${lead.name}; the accepted face map reads as `
      + `${element.name} structure in the Mian Xiang Five Elements tradition.`,
    frameLine: `${element.shape} geometry · ${courtLabel}`,
    element,
    courts: {
      ...courts,
      label: courtLabel,
      percentages: Object.fromEntries(Object.entries(courts.fractions || {}).map(
        ([key, value]) => [key, Number.isFinite(value) ? Math.round(value * 100) : null],
      )),
    },
    palaces: {
      measured: measuredPalaces,
      measuredCount: palaceSource?.measuredCount || 0,
      supportedCount: palaceSource?.supportedCount || 0,
      totalCount: palaceSource?.totalCount || 12,
      sourcesDiffer: palaceSource?.sourcesDiffer || null,
    },
    harmony: harmony ? {
      ...harmony,
      label: Number.isFinite(harmony.value)
        ? `${harmony.value}% alignment with the named canons`
        : "Canon comparison unavailable",
      components: harmonyComponents,
    } : null,
    provenanceIds: Object.values(source.provenanceIds || {}),
  };
}

export function calibrationModel(reading, history) {
  const stored = Number.isInteger(reading?.baselineProgress) ? reading.baselineProgress : null;
  const atReading = (history || []).filter((item) => item?.valid !== false
    && (!reading?.timestampIso || String(item.timestampIso) <= String(reading.timestampIso))).length;
  const current = Math.max(1, Math.min(4, stored || atReading));
  const remaining = Math.max(0, 4 - current);
  const headings = [
    "Your pattern starts with one mark.",
    "The outline is taking shape.",
    "One more anchor scan will reveal change.",
    "Your personal pattern is ready.",
  ];
  return {
    active: !reading?.compass,
    current,
    required: 4,
    remaining,
    progress: current / 4,
    title: headings[current - 1],
    verdict: remaining
      ? `Today is anchor ${current} of 4 — a real reading, before personal comparison begins.`
      : "Your personal comparison is ready.",
    reflection: "What would be worth noticing if this pattern shifted?",
    story: "In Mian Xiang, facial colour was regarded as changing appearance rather than a fixed trait. This first impression records what the camera could see today; similar light on later scans helps separate a pattern from the room.",
  };
}

/**
 * The whole reading screen as data.
 *
 * @param {Object} reading today's stored record
 * @param {Array} history oldest first, including today
 */
export function readingScreenModel(reading, history, options = {}) {
  const confidence = typeof reading.confidence === "number" ? reading.confidence : 1;
  const low = isLowConfidence(confidence);
  const compass = reading.compass || { ascendant: "ping", magnitude: 0, components: {} };

  const z = {
    ming: reading.z ? reading.z.ming : 0,
    run: reading.z ? reading.z.run : 0,
  };

  const seal = sealModel(reading, { lowConfidence: low });
  const calibration = calibrationModel(reading, history);
  const hook = calibration.active
    ? { title: calibration.title, reflection: calibration.reflection }
    : hookFor(compass);

  return {
    order: READING_SCREEN_ORDER,
    confidence,
    lowConfidence: low,
    seal,
    sealSvg: sealSvg(seal, { reducedMotion: options.reducedMotion === true }),
    verdict: calibration.active ? calibration.verdict : verdictFor(compass),
    hook,
    calibration,
    composition: compositionStrip(reading),
    integrated: integratedReadingModel(reading),
    gauges: [
      gaugeModel(history, metricOf(reading, "ming"), "ming", "明 lustre"),
      gaugeModel(history, metricOf(reading, "run"), "run", "潤 moisture"),
    ],
    courts: courtsStrip(reading.roiValidity),
    passage: calibration.active
      ? { text: calibration.story, source: "Mian Xiang context", calibration: true }
      : passageFor(compass, z, reading.timestampIso),
    tags: Array.isArray(reading.tags) ? [...reading.tags] : [],
    sparkline: sparklineModel(history, "ming"),
  };
}

/**
 * The history column: one seal per day, newest first, like an almanac margin.
 *
 * This column is also the share card, which is why it is a model rather than
 * markup — the same data draws to a DOM node and to a canvas.
 */
export function historyColumnModel(history, { limit = 30 } = {}) {
  const rows = (history || []).slice(-limit).reverse().map((r) => {
    const low = typeof r.confidence === "number" ? isLowConfidence(r.confidence) : false;
    const model = sealModel(r, { lowConfidence: low });
    const composition = compositionStrip(r);
    return {
      timestampIso: r.timestampIso,
      date: String(r.timestampIso || "").slice(0, 10),
      ascendant: (r.compass && r.compass.ascendant) || "ping",
      lowConfidence: low,
      seal: model,
      composition,
      hook: r.compass ? hookFor(r.compass).title : calibrationModel(r, history).title,
      svg: sealSvg(model, { title: `Reading for ${String(r.timestampIso || "").slice(0, 10)}` }),
    };
  });
  return { rows, n: rows.length, colours: COLOUR_ORDER };
}
