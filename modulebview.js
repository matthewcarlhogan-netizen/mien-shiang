/*
 * MODULE B — rendering.
 *
 * ── WHY THIS IS NOT IN ui.js ───────────────────────────────────────────────
 * Every referral heading, halt notice and clinical word used to live inside
 * `ui.js`, which is a Module A surface. The copy lint found them there, and it
 * was right to: a build that stubs Module B out still shipped "Stop — see a
 * clinician" and "A referral takes precedence" in its main UI file.
 *
 * Module B's words now live with Module B. In the entertainment flavour the
 * build stubs the content modules, this renderer is handed nothing, and it
 * returns empty strings — so none of that vocabulary reaches the screen and,
 * because the strings are here rather than in ui.js, the bundle lint can
 * verify the separation on the artefact.
 *
 * Clinical vocabulary is permitted in this file. Disease names are not, here
 * or anywhere (TGA exclusion 14B — see CLAUDE.md).
 */

import { MODULE_B_DISCLAIMER } from "./rules-b.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Referrals: the safety gates. Pre-empt the reading entirely. */
export function renderReferrals(referrals) {
  if (!referrals?.length) return "";
  return referrals.map((ref) => `
    <div class="referral">
      <p class="eyebrow">Please see a clinician</p>
      <h3>${ref.referralTo === "dermatologist"
        ? "Outside what this app looks at"
        : "Worth a doctor's eyes"}</h3>
      <p>${esc(ref.message)}</p>
      <div class="prov"><b>rule</b> ${esc(ref.rule)}${
        ref.measured ? ` · <b>measured</b> ${esc(ref.measured)}` : ""}</div>
    </div>`).join("");
}

/** Shown when a gate has halted the reading. */
export function renderHaltNotice(halted) {
  if (!halted) return "";
  return `<p class="halted">The face reading is paused for this photo. The note
    above takes precedence — this app won't show a light-hearted reading next to
    something a clinician should look at.</p>`;
}

/** Advisories: Module B, but not a referral. No halt, no alarm styling. */
export function renderAdvisories(advisories) {
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

/**
 * What the photo could and couldn't measure.
 *
 * Lives in Module B because it describes the limits of the measurement in
 * clinical terms. Module A's reading states its own limits in its own
 * vocabulary (qi se basis notes, unmeasured palaces).
 */
export function renderMeasurementLimits(baseline, notMeasured) {
  const low = baseline?.regime === "low";
  return `
    <div class="limits ${low ? "warn" : ""}">
      <p class="eyebrow">What this photo could and couldn't measure</p>
      ${baseline?.reason ? `<p>${esc(baseline.reason)}</p>` : ""}
      <p class="notmeasured">Not checked: ${esc(
        (notMeasured ?? []).join(", ").replace(/_/g, " "))}</p>
      <p class="muted" style="font-size:.78rem">Those need a model trained on
        labelled photographs, which this build doesn't have. Nothing above is a
        check for them.</p>
    </div>`;
}
