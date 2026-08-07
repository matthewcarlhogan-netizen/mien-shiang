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

import { MODULE_B_DISCLAIMER } from "./rules-b.js";

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** The single consistent pattern for "the sources disagree here". */
export const sourcesNote = (text) =>
  text ? `<p class="differ"><span class="differ-mark">⚖</span>${esc(text)}</p>` : "";

const section = (eyebrow, title, body) => `
  <section class="reading-block">
    <p class="eyebrow">${esc(eyebrow)}</p>
    ${title ? `<h3>${title}</h3>` : ""}
    ${body}
  </section>`;

function renderFiveElements(fe) {
  if (!fe) return "";
  if (!fe.available) {
    return section("Five Elements 五行", "Not read from this photo",
      `<p class="muted">${esc(fe.note)}</p>`);
  }
  const alts = fe.alternates.map((a) => `${esc(a.name)} ${esc(a.hanzi)}`).join(" or ");
  return section("Five Elements 五行",
    `${esc(fe.name)} <span class="hanzi">${esc(fe.hanzi)}</span>`,
    `<p>${esc(fe.reading)}</p>
     ${fe.residualShape ? `<p class="muted small">Your face didn't match any of the
        distinct shape rules, so it fell to the balanced default — which makes this
        the least anchored part of the reading.</p>` : ""}
     <p class="muted small">Other texts would read this shape as ${esc(alts)}.</p>
     ${sourcesNote(fe.sourcesDiffer)}`);
}

function renderThreeCourts(tc) {
  if (!tc || !tc.available) return "";
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const title = tc.balanced
    ? "Balanced" : `${esc(tc.court.name)} <span class="hanzi">${esc(tc.court.hanzi)}</span>`;
  return section("Three Courts 三停", title,
    `<table class="dbg"><tbody>
       <tr><td>upper</td><td class="v">${pct(tc.fractions.upper)}</td></tr>
       <tr><td>middle</td><td class="v">${pct(tc.fractions.middle)}</td></tr>
       <tr><td>lower</td><td class="v">${pct(tc.fractions.lower)}</td></tr>
     </tbody></table>
     <p>${esc(tc.reading)}</p>
     <p class="muted small">${esc(tc.measurementCaveat)}</p>
     ${sourcesNote(tc.sourcesDiffer)}`);
}

function renderQiSe(q) {
  if (!q) return "";
  if (!q.available) {
    return section("Qi se 氣色", "Not read from this photo",
      `<p class="muted">${esc(q.note)}</p>`);
  }
  return section("Qi se 氣色", `Glow ${q.glowIndex}`,
    `${q.basisNote
        ? `<p class="basis-note">${esc(q.basisNote)}</p>`
        : ""}
     <p>${esc(q.reading)}</p>
     ${sourcesNote(q.sourcesDiffer)}`);
}

function renderPalaces(tp) {
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

  return section("Twelve Palaces 十二宮",
    `${tp.measuredCount} of ${tp.totalCount} read from this photo`,
    `${tp.palaces.map(row).join("")}
     ${sourcesNote(tp.sourcesDiffer)}`);
}

/** Module A only. Module B is rendered separately, by renderModuleB(). */
export function renderReading(reading) {
  if (!reading) return "";
  return `<div class="reading">
    ${renderQiSe(reading.qiSe)}
    ${renderFiveElements(reading.fiveElements)}
    ${renderThreeCourts(reading.threeCourts)}
    ${renderPalaces(reading.twelvePalaces)}
  </div>`;
}

/**
 * Module B's advisories, under Module B's disclaimer.
 *
 * Returns "" when there is nothing to show — including in an
 * entertainment-only build, where the rules were never composed in, so
 * `advisories` is empty and the disclaimer never appears either.
 */
export function renderModuleB(advisories) {
  if (!advisories?.length) return "";
  return `
    <div class="module-b">
      <p class="eyebrow">A separate note</p>
      <p class="module-b-disclaimer">${esc(MODULE_B_DISCLAIMER)}</p>
      ${advisories.map((a) => `
        <div class="advisory">
          <p>${esc(a.message)}</p>
          ${a.recommend?.length
            ? `<ul>${a.recommend.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
          <div class="prov"><b>rule</b> ${esc(a.rule)}</div>
        </div>`).join("")}
    </div>`;
}
