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
    <p class="reading-lead">${esc(READING_LEAD)}</p>
    ${renderQiSe(reading.qiSe)}
    ${renderFiveElements(reading.fiveElements)}
    ${renderThreeCourts(reading.threeCourts)}
    ${renderPalaces(reading.twelvePalaces)}
  </div>`;
}

/**
 * Summary card — one-glance overview shown at the top of results.
 * Distils the four reading sections into a scannable headline block.
 */
export function renderSummary(reading) {
  if (!reading) return "";

  const q = reading.qiSe;
  const fe = reading.fiveElements;
  const tc = reading.threeCourts;
  const tp = reading.twelvePalaces;

  // Glow block
  let glowBlock = "";
  if (q?.available) {
    glowBlock = `
      <div class="summary-glow">
        <div class="summary-glow-number">${q.glowIndex}</div>
        <div>
          <div class="summary-glow-label">QI SE 氣色 — Complexion glow</div>
          <div class="summary-glow-desc">${esc(q.reading.split(".")[0])}</div>
        </div>
      </div>`;
  }

  // Pills for the four dimensions
  const pills = [];
  if (fe?.available) {
    pills.push(`<span class="summary-pill active">${esc(fe.name)} ${esc(fe.hanzi)}</span>`);
  } else {
    pills.push(`<span class="summary-pill">Element not read</span>`);
  }
  if (tc?.available) {
    const label = tc.balanced ? "Courts balanced" : `${esc(tc.court.name)} dominant`;
    pills.push(`<span class="summary-pill active">${label}</span>`);
  }
  if (tp) {
    pills.push(`<span class="summary-pill ${tp.measuredCount < tp.totalCount ? "warn" : "active"}">${tp.measuredCount}/${tp.totalCount} palaces read</span>`);
  }

  // Headline: pick the most prominent dimension
  let headline = "Reading complete";
  let subtitle = "Scroll down to explore each section";
  if (fe?.available) {
    headline = `${fe.name} type${fe.hanzi ? " — " + fe.hanzi : ""}`;
    subtitle = fe.reading.length > 90 ? fe.reading.slice(0, 90) + "…" : fe.reading;
  } else if (q?.available) {
    headline = `Glow index ${q.glowIndex}`;
    subtitle = q.reading.length > 90 ? q.reading.slice(0, 90) + "…" : q.reading;
  }

  return `
    <div class="summary-card">
      <p class="eyebrow">Reading summary</p>
      <h2 class="summary-headline">${esc(headline)}</h2>
      <p class="summary-subtitle">${esc(subtitle)}</p>
      <div class="summary-pills">${pills.join("")}</div>
      ${glowBlock}
    </div>`;
}
