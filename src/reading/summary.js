/*
 * MODULE A — the reading receipt.
 *
 * Distils the four readings into a scannable summary. Pure, no DOM, so the one
 * rule that matters here is assertable by a test rather than trusted:
 *
 * ── IT MAY ONLY REPEAT WHAT WAS MEASURED ───────────────────────────────────
 * This layer is where a summary would be tempted to lie. A headline wants a
 * single confident value; the readings underneath are frequently partial. So:
 *
 *   - a construct that is not `available` produces a NOT-READ chip and is
 *     absent from the headline. It is never defaulted, interpolated or guessed.
 *   - the coverage line states scope in the same numbers the sections use
 *     (5 of 6 supported palaces, 2 of 3 colour signals), so the summary cannot round a
 *     partial basis up into a whole one.
 *   - the emphasis sentence is built ONLY from constructs that were read, and
 *     is attributed to the tradition rather than asserted of the reader.
 *
 * If every construct is unread the summary says so and offers no headline.
 * Manufacturing a conclusion the sections below do not support is the single
 * failure this module exists to prevent.
 *
 * The always-visible "entertainment, not a diagnostic device" caveat is NOT
 * here. It has to use vocabulary the Module A blocklist forbids, so it lives
 * in index.html under the disclaimer bucket — the narrow, sanctioned
 * exemption — and is passed into the view. See CLAUDE.md item 21. Nothing in
 * this directory may carry that marker, and a test enforces it.
 */

/** Anchor ids the detail sections render, so a chip can jump to its section. */
export const SECTION_IDS = {
  qiSe: "sec-qi-se",
  fiveElements: "sec-five-elements",
  threeCourts: "sec-three-courts",
  twelvePalaces: "sec-twelve-palaces",
};

/** Shown on a chip whose construct could not be read from this photo. */
export const NOT_READ_LABEL = "not read in this light";

export const NOTHING_READ =
  "Nothing in this photo could be read closely enough to summarise. The sections below say " +
  "which part fell short and why, rather than offering a reading built on it.";

/** Shown on a chip whose construct could not be available in this photo. */
export const NOT_AVAILABLE_LABEL = "not available in this photo";

export const NOTHING_AVAILABLE =
  "Nothing in this photo could be read closely enough to summarise. The sections below say " +
  "which part fell short and why, rather than offering a reading built on it.";

/** Lead-in for the emphasis line. Attributed, and about the reading. */
export const EMPHASIS_LEAD = "In Mian Xiang, this photo read most clearly on";

/** Court names are needed for the headline without importing the readings. */
const COURT_LABEL = { upper: "Upper Section", middle: "Middle Section", lower: "Lower Section" };

const NUMBER_WORD = ["zero", "one", "two", "three"];

/**
 * @param {object} reading `composeReading()` output
 * @returns {{headline:Array, coverage:Array<string>, chips:Array, emphasis:string|null,
 *            anyRead:boolean}}
 */
export function buildSummary(reading) {
  const fe = reading?.fiveElements;
  const tc = reading?.threeCourts;
  const q = reading?.qiSe;
  const tp = reading?.twelvePalaces;
  const supportedPalaces = tp ? (tp.supportedCount ?? tp.totalCount) : 0;

  // ── headline ────────────────────────────────────────────────────────────
  // Only constructs that were actually read. Order is most-structural first;
  // qi se comes last because the tradition itself treats it as the passing one.
  const headline = [];
  if (fe?.available) headline.push({ key: "fiveElements", label: fe.name });
  if (tc?.available) {
    headline.push(tc.balanced
      ? { key: "threeCourts", label: "Sections balanced" }
      : { key: "threeCourts", label: COURT_LABEL[tc.dominant] });
  }
  if (q?.available) headline.push({ key: "qiSe", label: `Glow ${q.glowIndex}` });

  // ── coverage ────────────────────────────────────────────────────────────
  // Scope, stated in the same numbers the detailed sections use. Partial
  // coverage is a fact about the photo, not a failure to hide.
  const coverage = [];
  if (tp) coverage.push(tp.measuredCount === supportedPalaces
    ? `all ${supportedPalaces} supported palace regions available`
    : `${tp.measuredCount} of ${supportedPalaces} supported palace regions available`);
  if (q?.available) {
    const used = q.signalsUsed?.length ?? 0;
    const total = used + (q.signalsMissing?.length ?? 0);
    coverage.push(`${used} of ${total} colour signals`);
    // Name the missing signal rather than only counting it — "2 of 3" alone
    // does not tell the reader WHICH part of the complexion went unmeasured.
    for (const s of q.signalsMissing ?? []) {
      coverage.push(`${SIGNAL_LABEL[s] ?? s} not available in this photo`);
    }
  } else if (q && !q.available) {
    coverage.push("complexion not available in this photo");
  }
  if (fe && !fe.available) coverage.push("face shape not available in this photo");

  // ── chips ───────────────────────────────────────────────────────────────
  const chips = [
    chip("qiSe", "Qi se", q?.available ? `Glow ${q.glowIndex}` : null),
    chip("fiveElements", "Five Elements",
      fe?.available ? fe.name : null),
    chip("threeCourts", "Three Sections", tc?.available
      ? (tc.balanced ? "Balanced" : COURT_LABEL[tc.dominant]) : null),
    // The palaces are never "unread" as a construct — partial coverage IS the
    // result, so this chip carries the count rather than a not-read state.
    tp
      ? { key: "twelvePalaces", label: "Twelve Palaces", href: `#${SECTION_IDS.twelvePalaces}`,
          value: tp.measuredCount === supportedPalaces
            ? `Complete · ${supportedPalaces} supported`
            : `${tp.measuredCount} of ${supportedPalaces} supported`,
          available: true, partial: tp.measuredCount < supportedPalaces }
      : chip("twelvePalaces", "Twelve Palaces", null),
  ];

  // ── emphasis ────────────────────────────────────────────────────────────
  const emphasis = headline.length
    ? `${EMPHASIS_LEAD} ${joinLabels(headline.map((h) => h.label))}.`
    : null;

  return {
    headline,
    coverage,
    chips,
    emphasis,
    anyRead: headline.length > 0,
    nothingReadNote: headline.length ? null : NOTHING_READ,
  };
}

const SIGNAL_LABEL = {
  warmth: "complexion warmth",
  luminosity: "luminosity",
  evenness: "evenness",
};

function chip(key, label, value) {
  return {
    key, label,
    href: `#${SECTION_IDS[key]}`,
    value: value ?? NOT_AVAILABLE_LABEL,
    available: value !== null,
    partial: false,
  };
}

function joinLabels(names) {
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

export { NUMBER_WORD };
