/*
 * Renders Module A's reading, and Module B's output beneath its own disclaimer.
 *
 * Pure — report in, HTML string out, no DOM. Same reason as debugview.js: it
 * can then be tested with no browser and no face photo, and the structural
 * guarantees below are assertable on the output rather than trusted.
 *
 * ── THE TWO STRUCTURAL GUARANTEES THIS FILE OWES ───────────────────────────
 *
 * 1. A DISAGREEMENT NOTE RENDERS WHEREVER ONE EXISTS. The classical sources
 *    conflict — most sharply on Five Elements face-shape assignment — and a
 *    reading that quietly picks a side presents a contested mapping as settled.
 *    `sourcesNote()` is the one consistent pattern used for all of them.
 *
 * 2. MODULE B NEVER RENDERS INSIDE MODULE A. Advisories and referrals appear
 *    only under MODULE_B_DISCLAIMER, in their own block, visually separate. A
 *    reader must be able to tell which of two very different kinds of statement
 *    they are looking at without knowing this app's architecture.
 */

import { READING_LEAD } from "./reading/index.js";
import { buildSummary, SECTION_IDS } from "./reading/summary.js";

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * The single consistent pattern for "the sources disagree here".
 *
 * PROGRESSIVELY DISCLOSED, NOT REMOVED. Four identical notices in a row read
 * as boilerplate and stop being read at all, which costs the honesty they
 * exist to buy. So each collapses behind its own control — but the FIRST one
 * on the page stays open, so a reader meets the disagreement before they meet
 * the readings, without having to go looking. The wording is untouched, and
 * `<details>` keeps the text in the document for search and screen readers
 * whether it is open or shut.
 */
export const sourcesNote = (text, { expanded = false } = {}) =>
  text
    ? `<details class="differ-disclosure"${expanded ? " open" : ""}>
         <summary><span class="differ-mark" aria-hidden="true">⚖</span>Sources differ</summary>
         <p class="differ-body">${esc(text)}</p>
       </details>`
    : "";

const section = (eyebrow, title, body, id) => `
  <section class="reading-block"${id ? ` id="${esc(id)}"` : ""}>
    <p class="eyebrow">${esc(eyebrow)}</p>
    ${title ? `<h3>${title}</h3>` : ""}
    ${body}
  </section>`;

/** One-line plain meaning, above the detail. Part of the section template. */
const lede = (text) => `<p class="lede">${esc(text)}</p>`;

function renderFiveElements(fe, openDiffer) {
  if (!fe) return "";
  if (!fe.available) {
    return section("Five Elements 五行", "Not read from this photo",
      `<p class="muted">${esc(fe.note)}</p>`, SECTION_IDS.fiveElements);
  }
  const alts = fe.alternates.map((a) => `${esc(a.name)} ${esc(a.hanzi)}`).join(" or ");
  return section("Five Elements 五行",
    `${esc(fe.name)} <span class="hanzi">${esc(fe.hanzi)}</span>`,
    `${lede(`The tradition types this face shape as ${fe.name}.`)}
     <p>${esc(fe.reading)}</p>
     ${fe.residualShape ? `<p class="muted small">This face didn't match any of the
        distinct shape rules, so it fell to the balanced default — which makes this
        the least anchored part of the reading.</p>` : ""}
     <p class="muted small">Other texts would read this shape as ${esc(alts)}.</p>
     ${sourcesNote(fe.sourcesDiffer, { expanded: openDiffer() })}`,
    SECTION_IDS.fiveElements);
}

/**
 * The Three Courts as a proportion bar.
 *
 * Three things this must not lose, all of them load-bearing:
 *  - the EXACT measured percentages, to one decimal, unrounded;
 *  - meaning that survives without colour — every segment carries its own text
 *    label, so the bar is redundant with the text rather than the only carrier;
 *  - the hairline caveat, directly beneath. The upper court is measured from
 *    the top of the face oval rather than the trichion, so it reads short — a
 *    bar makes that distortion look precise, which is exactly why the caveat
 *    has to sit with it.
 */
function renderThreeCourts(tc, openDiffer) {
  if (!tc || !tc.available) return "";
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const order = ["upper", "middle", "lower"];
  const NAMES = {
    upper: { name: "Upper Court", hanzi: "上停" },
    middle: { name: "Middle Court", hanzi: "中停" },
    lower: { name: "Lower Court", hanzi: "下停" },
  };

  const alt = order
    .map((k) => `${NAMES[k].name} ${pct(tc.fractions[k])}`).join(", ");

  const segments = order.map((k) => `
    <div class="court-seg court-${k}${tc.dominant === k ? " is-dominant" : ""}"
         style="flex:${tc.fractions[k].toFixed(4)}">
      <span class="court-seg-pct">${pct(tc.fractions[k])}</span>
    </div>`).join("");

  const legend = order.map((k) => `
    <li class="court-key">
      <span class="court-swatch court-${k}" aria-hidden="true"></span>
      <span class="court-name">${esc(NAMES[k].name)}
        <span class="hanzi">${esc(NAMES[k].hanzi)}</span></span>
      <span class="court-pct">${pct(tc.fractions[k])}</span>
      ${tc.dominant === k ? `<span class="tag">dominant</span>` : ""}
    </li>`).join("");

  const title = tc.balanced
    ? "Balanced" : `${esc(tc.court.name)} <span class="hanzi">${esc(tc.court.hanzi)}</span>`;

  return section("Three Courts 三停", title,
    `${lede(tc.balanced
        ? "The three courts came out near equal in this photo."
        : `The ${NAMES[tc.dominant].name.toLowerCase()} is the longest of the three in this photo.`)}
     <div class="court-bar" role="img"
          aria-label="Facial thirds by proportion: ${esc(alt)}">${segments}</div>
     <ul class="court-legend">${legend}</ul>
     <p class="muted small">${esc(tc.measurementCaveat)}</p>
     <p>${esc(tc.reading)}</p>
     ${sourcesNote(tc.sourcesDiffer, { expanded: openDiffer() })}`,
    SECTION_IDS.threeCourts);
}

function renderQiSe(q, openDiffer) {
  if (!q) return "";
  if (!q.available) {
    return section("Qi se 氣色", "Not read from this photo",
      `<p class="muted">${esc(q.note)}</p>`, SECTION_IDS.qiSe);
  }
  return section("Qi se 氣色", `Glow ${q.glowIndex}`,
    `${lede("Qi se reads the complexion of a day rather than the structure of a face.")}
     ${q.basisNote
        ? `<p class="basis-note">${esc(q.basisNote)}</p>`
        : ""}
     <p>${esc(q.reading)}</p>
     ${sourcesNote(q.sourcesDiffer, { expanded: openDiffer() })}`,
    SECTION_IDS.qiSe);
}

/**
 * Why seven palaces go unread. Stated once, as scope rather than as failure.
 *
 * Deliberately plain about the cause: those palaces sit on features a single
 * front-on still does not isolate as separate areas. That is a property of the
 * photograph, not a shortfall in the reader or a fault in the app.
 */
export const PALACE_SCOPE_NOTE =
  "A single front-on photo doesn't isolate the brows, eyelids, temples and outer eye corners as " +
  "separate areas to read, so the palaces that sit on them are listed with their traditional " +
  "meaning and left unread rather than guessed at.";

function renderPalaces(tp, openDiffer) {
  if (!tp) return "";
  const row = (p) => `
    <details class="palace">
      <summary><span class="hanzi">${esc(p.hanzi)}</span> ${esc(p.name)}
        <span class="muted small">— ${esc(p.location)}</span>
        ${p.measured ? "" : `<span class="tag">not read</span>`}</summary>
      <p>${esc(p.reading)}</p>
      ${p.translationNote ? `<p class="muted small">${esc(p.translationNote)}</p>` : ""}
      ${p.measured
        ? `<p class="muted small">${esc(p.toneGloss)}</p>`
        : `<p class="muted small">${esc(p.notMeasuredNote)}</p>`}
    </details>`;

  const read = tp.palaces.filter((p) => p.measured);
  const unread = tp.palaces.filter((p) => !p.measured);

  // Two labelled groups rather than one list of greyed-out failures. The seven
  // are out of frame for a still photo, which is a statement about scope; the
  // old presentation read as seven things that went wrong.
  const group = (label, items) => items.length
    ? `<h4 class="palace-group">${esc(label)} (${items.length})</h4>
       ${items.map(row).join("")}`
    : "";

  return section("Twelve Palaces 十二宮",
    `${tp.measuredCount} of ${tp.totalCount} read from this photo`,
    `${lede("The twelve palaces map areas of the face to areas of a life.")}
     ${group("Read from this photo", read)}
     ${group("Not read from this photo", unread)}
     <p class="muted small palace-scope">${esc(PALACE_SCOPE_NOTE)}</p>
     ${sourcesNote(tp.sourcesDiffer, { expanded: openDiffer() })}`,
    SECTION_IDS.twelvePalaces);
}

/** Module A only. Module B is rendered separately, by renderModuleB(). */
export function renderReading(reading) {
  if (!reading) return "";
  // Exactly one disagreement notice starts open — whichever renders first —
  // so the honesty is visible without four identical boxes competing.
  let used = false;
  const openDiffer = () => (used ? false : (used = true));

  return `<div class="reading">
    <p class="reading-lead">${esc(READING_LEAD)}</p>
    ${renderQiSe(reading.qiSe, openDiffer)}
    ${renderFiveElements(reading.fiveElements, openDiffer)}
    ${renderThreeCourts(reading.threeCourts, openDiffer)}
    ${renderPalaces(reading.twelvePalaces, openDiffer)}
  </div>`;
}

/**
 * Summary card — the reading receipt, shown above the detailed sections.
 *
 * ── WHAT CHANGED AND WHY IT MATTERS ────────────────────────────────────────
 * The previous version built its subtitle by TRUNCATING a reading to 90
 * characters, or by taking `reading.split(".")[0]`. Every Module A reading
 * opens with its attribution — "In Mian Xiang…", "Classical Chinese face
 * reading…" — and cutting a sentence at a fixed offset can strand that
 * attribution, turning a statement about a tradition into a statement about
 * the reader. That is precisely the failure the copy guards exist to catch,
 * arriving through a code path they do not scan.
 *
 * So the summary no longer excerpts prose at all. It repeats measured VALUES,
 * and its one sentence is composed from the constructs that were read, with
 * the attribution built in. See reading/summary.js.
 *
 * @param {object} reading  `composeReading()` output
 * @param {object} [opts]
 * @param {string} [opts.caveatHtml]  the always-visible disclaimer, supplied by
 *        the DOM layer from index.html. It uses vocabulary the Module A copy
 *        blocklist forbids, so it cannot be a string literal in this file.
 * @param {string} [opts.actionsHtml] share/save controls, if the build has them
 */
export function renderSummary(reading, opts = {}) {
  if (!reading) return "";
  const s = buildSummary(reading);

  const headline = s.headline.length
    ? s.headline.map((h) =>
        `<span class="summary-term">${esc(h.label)}<span class="hanzi">${esc(h.hanzi)}</span></span>`)
        .join(`<span class="summary-sep" aria-hidden="true">·</span>`)
    : "";

  const coverage = s.coverage.length
    ? `<p class="summary-coverage">${s.coverage.map(esc).join(
        ` <span class="summary-sep" aria-hidden="true">·</span> `)}</p>`
    : "";

  const chips = s.chips.map((c) => `
    <a class="summary-chip${c.available ? " is-read" : " is-unread"}${c.partial ? " is-partial" : ""}"
       href="${esc(c.href)}">
      <span class="summary-chip-label">${esc(c.label)}</span>
      <span class="summary-chip-value">${esc(c.value)}</span>
    </a>`).join("");

  return `
    <div class="summary-card">
      <p class="eyebrow">Reading receipt</p>
      ${s.anyRead
        ? `<h2 class="summary-headline">${headline}</h2>`
        : `<p class="summary-nothing">${esc(s.nothingReadNote)}</p>`}
      ${coverage}
      <nav class="summary-chips" aria-label="Jump to a section of the reading">${chips}</nav>
      ${s.emphasis ? `<p class="summary-emphasis">${esc(s.emphasis)}</p>` : ""}
      ${opts.actionsHtml ?? ""}
      ${opts.caveatHtml ?? ""}
    </div>`;
}
