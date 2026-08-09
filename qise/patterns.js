/*
 * PHASE 8 — patterns across tagged readings.
 *
 * ── WHAT THIS IS ALLOWED TO SAY ────────────────────────────────────────────
 * Frequencies, with n always shown. Nothing else. Not because frequencies are
 * more interesting than the alternatives, but because everything else this
 * data could be made to say would be false:
 *
 *   - No causal language. Thirty self-tagged readings from one person cannot
 *     separate a cause from a coincidence, and "your lustre drops when you
 *     sleep badly" is a causal claim whatever hedge precedes it.
 *   - No p-values. The tags are chosen after the fact by the person being
 *     measured, the metrics are correlated with each other, and every tag is
 *     tested at once. A p-value computed on that is a number with a
 *     respectable name and no meaning.
 *   - No predictions. There is no model here, and "expect" is a health claim
 *     wearing a weather forecast's clothes.
 *   - No health framing. Any of the above turns a general wellness tool into
 *     something that needs ARTG inclusion, and under the Therapeutic Goods
 *     (Excluded Goods) Determination every function must independently
 *     qualify — one non-conforming feature voids the exclusion for the whole
 *     product.
 *
 * ── WHY n >= 5 AND WHY LOW-CONFIDENCE READINGS DO NOT COUNT ────────────────
 * Four readings can put three on one side of a range by chance often enough
 * that the app would find a "pattern" in most tags within a fortnight. And a
 * low-confidence reading is one where the measurement itself is in doubt, so
 * counting it toward n buys volume with exactly the readings least able to
 * support a statement.
 */

/**
 * Readings needed before a tag is reported at all.
 *
 * Not a significance threshold and not presented as one. It is the point below
 * which the app would be narrating noise back to the person who generated it.
 */
export const MIN_TAGGED_READINGS = 5;

/** Below this the measurement is in doubt, so it does not count toward n. */
export const MIN_CONFIDENCE_TO_COUNT = 0.6;

/**
 * The metrics a pattern may be reported on, and what they are called.
 *
 * `han` and `xue` are deliberately absent. They are measured and stored, but
 * neither has a user-facing name that is both accurate and safe: xue's
 * classical name refers to something this product must never claim to
 * observe, and a made-up English label would imply the measurement means more
 * than it does.
 */
export const PATTERN_METRICS = Object.freeze([
  { key: "ming", label: "lustre" },
  { key: "run", label: "moisture" },
]);

const value = (reading, key) => {
  const m = reading && reading.metrics && (reading.metrics.corrected || reading.metrics.raw);
  const v = m ? m[key] : null;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

function quantile(xs, q) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** The reader's own interquartile range on a metric. Never anybody else's. */
export function usualRange(readings, key) {
  const xs = readings.map((r) => value(r, key)).filter((v) => v !== null);
  if (xs.length < 4) return null;
  return { low: quantile(xs, 0.25), high: quantile(xs, 0.75), n: xs.length };
}

const countable = (r) =>
  r && r.valid !== false
  && (typeof r.confidence !== "number" || r.confidence >= MIN_CONFIDENCE_TO_COUNT);

/**
 * Frequencies per tag per metric, for every tag that has enough readings.
 *
 * @param {Array} history readings, oldest first
 * @returns {Array<{tag:string, n:number, metric:string, label:string,
 *                  aboveRange:number, belowRange:number, inRange:number,
 *                  range:{low:number,high:number}}>}
 */
export function findPatterns(history) {
  const readings = (history || []).filter(countable);

  const byTag = new Map();
  for (const r of readings) {
    for (const tag of r.tags || []) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(r);
    }
  }

  const out = [];
  for (const [tag, tagged] of byTag) {
    // The floor, applied before anything is computed. A tag under it does not
    // appear at all — not with a caveat, not greyed out, not at all.
    if (tagged.length < MIN_TAGGED_READINGS) continue;

    for (const { key, label } of PATTERN_METRICS) {
      // The range is the reader's own, taken over ALL their countable
      // readings rather than only the tagged ones. Taken over the tagged
      // subset it would be the range of the thing being described, and
      // roughly half of them would sit inside it by construction.
      const range = usualRange(readings, key);
      if (!range) continue;

      let above = 0, below = 0, inside = 0;
      for (const r of tagged) {
        const v = value(r, key);
        if (v === null) continue;
        if (v > range.high) above++;
        else if (v < range.low) below++;
        else inside++;
      }
      const counted = above + below + inside;
      if (counted < MIN_TAGGED_READINGS) continue;

      out.push({
        tag, n: counted, metric: key, label,
        aboveRange: above, belowRange: below, inRange: inside,
        range: { low: range.low, high: range.high },
      });
    }
  }

  // Most-departed first, so the list leads with whatever actually moved.
  out.sort((a, b) => (b.aboveRange + b.belowRange) - (a.aboveRange + a.belowRange));
  return out;
}

/**
 * The one permitted sentence form.
 *
 * A single function so there is exactly one place the wording lives, and so
 * the compliance lint scans one string rather than trusting every call site.
 * n is always present; the sentence cannot be constructed without it.
 */
export function describePattern(p) {
  const departures = p.aboveRange >= p.belowRange
    ? { side: "above", times: p.aboveRange }
    : { side: "below", times: p.belowRange };

  return `Across ${p.n} readings you tagged '${p.tag}', your ${p.label} sat `
    + `${departures.side} your usual range ${departures.times} times.`;
}
