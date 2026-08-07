/*
 * "What the science says" — rendering.
 *
 * Pure, so the screen's contents can be asserted without a browser.
 *
 * Presented neutrally. No apology, no "just for fun", no softening of the
 * findings to protect the product, and equally no performance of guilt about
 * the product. Both tones invite the reader to skip it, which is the one
 * outcome this screen must not have.
 */

import { SCIENCE_TITLE, SCIENCE_INTRO, SCIENCE_POINTS, SCIENCE_REFERENCES }
  from "./reading/science.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** The one-tap entry point rendered on the results screen itself. */
export function renderScienceLink() {
  return `<button id="science-open" class="ghost science-link" type="button">
    ${esc(SCIENCE_TITLE)} →
  </button>`;
}

export function renderScienceScreen() {
  return `
    <div class="science">
      <p class="eyebrow">Alongside your reading</p>
      <h2>${esc(SCIENCE_TITLE)}</h2>
      <p class="science-intro">${esc(SCIENCE_INTRO)}</p>
      ${SCIENCE_POINTS.map((p) => `
        <section class="science-point">
          <h3>${esc(p.heading)}</h3>
          <p>${esc(p.body)}</p>
        </section>`).join("")}
      <p class="science-refs">${SCIENCE_REFERENCES.map(esc).join("<br />")}</p>
      <button id="science-close" type="button">Back to the reading</button>
    </div>`;
}
