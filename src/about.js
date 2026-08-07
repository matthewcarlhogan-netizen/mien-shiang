/*
 * About screen.
 *
 * ── WHY THE FLAG STATE IS HERE ─────────────────────────────────────────────
 * The two build flavours answer Google Play's Health apps declaration
 * differently. Which one a given install actually is must therefore be visible
 * to a human — a reviewer, a user, or whoever is filling in the store form —
 * without reading the source or running the app's analysis.
 *
 * Name and version are read from build-info.json, which the build writes from
 * package.json. They are not hardcoded here: a hardcoded version silently
 * becomes wrong on the first release that forgets to update it, and the About
 * screen is precisely where that would be believed.
 *
 * Pure rendering — the fetch is separated out so the markup can be tested with
 * no browser.
 */

import { MODULE_B_SAFETY_REFERRALS, BUILD_FLAVOUR } from "./flags.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * Open-source attribution. MediaPipe is Apache-2.0, which requires the notice
 * to be reproduced — this is that notice, not a courtesy.
 */
export const ACKNOWLEDGEMENTS = [
  {
    name: "MediaPipe Tasks Vision",
    version: "0.10.18",
    licence: "Apache License 2.0",
    holder: "Copyright 2023 The MediaPipe Authors",
    url: "https://github.com/google-ai-edge/mediapipe",
    note: "Face landmark detection and the face_landmarker model.",
  },
];

/** Everything else in the app is first-party with no npm dependencies. */
export const DEPENDENCY_NOTE =
  "Apart from the library above, this app has no third-party dependencies. " +
  "There is no framework, no analytics, and no advertising code.";

/**
 * @param {{name?:string, version?:string}} info  build-info.json, if available
 */
export function renderAbout(info = {}) {
  const version = info.version
    ? `v${esc(info.version)}`
    : "development build (version is written at build time)";

  const flavourLine = MODULE_B_SAFETY_REFERRALS
    ? "Wellness build"
    : "Entertainment build";

  return `
    <div class="about">
      <p class="eyebrow">About</p>
      <h2>Mien Shiang</h2>
      <p class="about-version">${version}</p>

      <div class="about-flavour">
        <p><strong>${esc(flavourLine)}</strong></p>
        <p class="muted small">Build flavour: <code>${esc(BUILD_FLAVOUR)}</code></p>
        ${MODULE_B_SAFETY_REFERRALS ? `
          <p class="muted small">This build includes wellness safety features.
          Safety referrals are never paywalled.</p>` : `
          <p class="muted small">This build contains the face reading only. The
          safety referral module is not included in it.</p>`}
      </div>

      <nav class="about-links">
        <button id="about-science" class="ghost" type="button">What the science says →</button>
        <button id="about-report" class="ghost" type="button">Report a result →</button>
        <a class="about-link" href="./privacy.html">Privacy Policy →</a>
        <a class="about-link" href="./terms.html">Terms of Service →</a>
      </nav>

      <p class="eyebrow" style="margin-top:1.5rem">Open source</p>
      ${ACKNOWLEDGEMENTS.map((a) => `
        <div class="ack">
          <p><strong>${esc(a.name)}</strong> ${esc(a.version)}</p>
          <p class="muted small">${esc(a.holder)} — ${esc(a.licence)}</p>
          <p class="muted small">${esc(a.note)}</p>
          <p class="muted small"><a href="${esc(a.url)}">${esc(a.url)}</a></p>
        </div>`).join("")}
      <p class="muted small">${esc(DEPENDENCY_NOTE)}</p>

      <button id="about-close" type="button">Close</button>
    </div>`;
}

/** Reads build-info.json if the build wrote one; degrades in development. */
export async function loadBuildInfo(fetchImpl = globalThis.fetch) {
  try {
    const res = await fetchImpl("./build-info.json", { cache: "no-store" });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    // Not an error worth surfacing: in development there is no build, and the
    // About screen says so rather than showing a version it cannot verify.
    return {};
  }
}
