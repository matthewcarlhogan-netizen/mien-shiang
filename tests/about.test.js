/*
 * About screen + the privacy/terms pages.
 *
 * The flag state on this screen is what a store reviewer, or whoever fills in
 * the Health declaration, would rely on. If it disagrees with the build, the
 * declaration is wrong — so it is asserted rather than eyeballed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderAbout, loadBuildInfo, ACKNOWLEDGEMENTS } from "../src/about.js";
import { MODULE_B_SAFETY_REFERRALS, BUILD_FLAVOUR } from "../src/flags.js";

const src = (p) => readFileSync(fileURLToPath(new URL(`../src/${p}`, import.meta.url)), "utf8");

// ─────────────────────────────────────────────────────────────── flag state ──

test("the About screen names the build flavour, matching the flag", () => {
  const html = renderAbout({ version: "1.0.0" });
  assert.ok(html.includes(BUILD_FLAVOUR), "the raw flavour string must be shown");
  assert.match(html, MODULE_B_SAFETY_REFERRALS ? /Wellness build/ : /Entertainment build/);
});

test("the wellness build states that safety referrals are never paywalled", () => {
  const html = renderAbout({});
  if (MODULE_B_SAFETY_REFERRALS) {
    assert.match(html, /Safety referrals are never paywalled/);
  } else {
    assert.doesNotMatch(html, /Safety referrals are never paywalled/,
      "an entertainment build has no referrals to make a promise about");
    assert.match(html, /safety referral module is not included/i);
  }
});

// ────────────────────────────────────────────────────────────────── version ──

test("the version comes from build info, never hardcoded", () => {
  assert.match(renderAbout({ version: "2.4.1" }), /v2\.4\.1/);
  // The APP's version must not be hardcoded: a hardcoded one silently goes
  // stale, and the About screen is exactly where a stale version is believed.
  // MediaPipe's version IS hardcoded here on purpose — it is part of the
  // Apache-2.0 attribution, not a claim about this app.
  const pkg = JSON.parse(readFileSync(
    fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
  assert.ok(!src("about.js").includes(pkg.version),
    `about.js must not hardcode the app version (${pkg.version}) — it comes from build-info.json`);
});

test("with no build info the screen says so instead of inventing a version", () => {
  const html = renderAbout({});
  assert.match(html, /development build/i);
  assert.doesNotMatch(html, /\bv\d/);
});

test("loadBuildInfo degrades to an empty object rather than throwing", async () => {
  assert.deepEqual(await loadBuildInfo(async () => { throw new Error("no file"); }), {});
  assert.deepEqual(await loadBuildInfo(async () => ({ ok: false })), {});
  assert.deepEqual(
    await loadBuildInfo(async () => ({ ok: true, json: async () => ({ version: "9.9.9" }) })),
    { version: "9.9.9" });
});

// ──────────────────────────────────────────────────────────────────── links ──

test("the About screen carries all four required links", () => {
  const html = renderAbout({});
  assert.match(html, /id="about-science"/, "science screen");
  assert.match(html, /id="about-report"/, "report control");
  assert.match(html, /href="\.\/privacy\.html"/, "privacy policy");
  assert.match(html, /href="\.\/terms\.html"/, "terms of service");
});

test("the privacy policy is linked from at least three surfaces", () => {
  // Required: settings/About, consent gate, paywall, About. There is no paywall
  // screen in this build, so three of the four exist and the fourth is added
  // with the paywall in Phase 5.
  const html = src("index.html");
  const surfaces = {
    "consent gate": /<div class="consent"[\s\S]*?privacy\.html[\s\S]*?<\/dialog>/,
    footer: /<footer[\s\S]*?privacy\.html[\s\S]*?<\/footer>/,
  };
  for (const [name, re] of Object.entries(surfaces)) {
    assert.match(html, re, `privacy policy must be linked from the ${name}`);
  }
  assert.match(renderAbout({}), /privacy\.html/, "and from the About screen");
});

// ─────────────────────────────────────────────────────── open-source notice ──

test("MediaPipe is attributed with its licence and copyright holder", () => {
  const mp = ACKNOWLEDGEMENTS.find((a) => /MediaPipe/i.test(a.name));
  assert.ok(mp, "MediaPipe must be acknowledged");
  assert.match(mp.licence, /Apache/);
  assert.match(mp.holder, /Copyright/);
  const html = renderAbout({});
  assert.ok(html.includes(mp.licence));
  assert.ok(html.includes(mp.holder));
});

// ──────────────────────────────────────────────────── privacy & terms pages ──

test("the privacy policy covers every required disclosure", () => {
  const html = src("privacy.html");
  const required = {
    "on-device processing": /analysed on your device|analysed on this device/i,
    "explicit non-transmission": /never (uploaded|transmitted)|not transmitted/i,
    "no retention": /discarded|not retained/i,
    "no analytics SDK": /no analytics/i,
    "no advertising SDK": /no advertising/i,
    "no sale of data": /do not sell/i,
    GDPR: /GDPR/,
    "GDPR lawful basis": /explicit consent/i,
    CCPA: /CCPA|CPRA/,
    "Australian Privacy Act": /Australian Privacy Principles|Privacy Act/,
    "sensitive information": /sensitive information/i,
    BIPA: /BIPA/,
    "no identity linkage": /not linked to your identity|no accounts/i,
    "contact email": /privacy@/,
    "30 days": /30 days/,
  };
  for (const [what, re] of Object.entries(required)) {
    assert.match(html, re, `privacy policy is missing: ${what}`);
  }
});

test("the privacy policy does not claim collection that does not happen", () => {
  // Sentry and RevenueCat are not integrated. A policy asserting that crash
  // reports and purchase data ARE collected would be an inaccurate legal
  // disclosure, so both are described as not currently active.
  const html = src("privacy.html");
  assert.match(html, /Not currently active/,
    "inactive integrations must be marked, not described as live collection");
  const notYetBlocks = html.match(/class="notyet"/g) ?? [];
  assert.ok(notYetBlocks.length >= 2,
    "both crash reporting and purchases must be marked as not yet active");
  assert.match(html, /RevenueCat privacy policy/, "RevenueCat's policy must be linked");
});

test("the terms page is real prose and is marked as an unreviewed draft", () => {
  const html = src("terms.html");
  assert.doesNotMatch(html, /lorem ipsum/i);
  assert.match(html, /working draft/i, "the terms must not imply legal review that has not happened");
  assert.match(html, /not a medical device/i);
  assert.match(html, /no scientific basis/i);
  assert.match(html, /does not rate you|no attractiveness score/i);
  assert.match(html, /Australian Consumer Law/);
  assert.ok(html.length > 2000, "the terms must have substance");
});

test("both pages link back to the app and to each other", () => {
  for (const page of ["privacy.html", "terms.html"]) {
    const html = src(page);
    assert.match(html, /href="\.\/index\.html"/, `${page} must link back to the app`);
  }
  assert.match(src("privacy.html"), /terms\.html/);
  assert.match(src("terms.html"), /privacy\.html/);
});
