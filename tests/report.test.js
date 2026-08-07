/*
 * "Report this result" — Google Play AI-Generated Content policy.
 *
 * The payload assertions are the important ones. A reporting feature is the
 * most natural place in an app like this for face data to escape — "send us
 * the reading so we can debug it" is a reasonable instinct and it would breach
 * the product's one hard promise. So the tests below check not only that the
 * payload is clean, but that the builder CANNOT see face data in the first
 * place.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  buildReportPayload, getSessionId, _resetSessionId, sendReport,
  renderReportButton, renderReportForm, renderReportConfirmation,
  REPORT_REASONS, NOTE_MAX_LENGTH, REPORT_CONFIRMATION, ALLOWED_PAYLOAD_KEYS,
} from "../src/report.js";
import { BUILD_FLAVOUR } from "../src/flags.js";

const src = (p) => readFileSync(fileURLToPath(new URL(`../src/${p}`, import.meta.url)), "utf8");

// ─────────────────────────────────────────────────────────────── the payload ─

test("the payload carries exactly the specified fields and nothing else", () => {
  const p = buildReportPayload("inaccurate", "the reading felt generic");
  assert.deepEqual(Object.keys(p).sort(), [...ALLOWED_PAYLOAD_KEYS].sort());
  assert.equal(p.type, "user_report");
  assert.equal(p.reason, "inaccurate");
  assert.equal(p.note, "the reading felt generic");
  assert.equal(p.moduleFlag, BUILD_FLAVOUR);
  assert.match(p.sessionId, /^[0-9a-f]{16}$/);
});

test("no key or value from the analysis pipeline can reach the payload", () => {
  const p = buildReportPayload("other", "note");
  const blob = JSON.stringify(p).toLowerCase();
  const PIPELINE = [
    "landmark", "blendshape", "canvas", "imagedata", "bitmap", "deltaei",
    "deltami", "glowindex", "observation", "region", "geometry", "complexion",
    "fwhr", "erythema", "shape", "palace", "element", "photo", "image",
  ];
  for (const k of PIPELINE) {
    assert.ok(!blob.includes(k), `report payload leaked "${k}"`);
    assert.ok(!Object.keys(p).some((key) => key.toLowerCase().includes(k)));
  }
});

test("buildReportPayload cannot see the reading — it takes only form fields", () => {
  // Structural, not behavioural: the function's signature is the guarantee.
  // Anything that accepted the analysis result could later be made to send it.
  assert.equal(buildReportPayload.length, 2, "must take exactly (reason, note)");

  // And passing a reading as the note still cannot smuggle structure through,
  // because the note is coerced to a string and truncated.
  const p = buildReportPayload("other", { glowIndex: 98, landmarks: [1, 2, 3] });
  assert.equal(typeof p.note, "string");
  assert.ok(!p.note.includes("98"));
});

test("the note is capped at 500 characters", () => {
  const p = buildReportPayload("other", "x".repeat(5000));
  assert.equal(p.note.length, NOTE_MAX_LENGTH);
  assert.equal(NOTE_MAX_LENGTH, 500);
});

test("a missing reason or note degrades to empty strings rather than undefined", () => {
  const p = buildReportPayload();
  assert.equal(p.reason, "");
  assert.equal(p.note, "");
});

// ──────────────────────────────────────────────────────────────── sessionId ──

test("the session id is random, stable within a session, and not persisted", () => {
  _resetSessionId();
  const a = getSessionId();
  assert.equal(getSessionId(), a, "must be stable within one session");

  _resetSessionId();
  const b = getSessionId();
  assert.notEqual(a, b, "a new session must not reuse the previous id");
  assert.match(b, /^[0-9a-f]{16}$/);
});

test("the session id is not derived from anything identifying", () => {
  const text = src("report.js");
  for (const term of ["userAgent", "platform", "localStorage", "deviceId",
    "fingerprint", "navigator.", "Date.now"]) {
    assert.ok(!text.includes(term),
      `session id must not be derived from ${term} — it would make reports linkable`);
  }
});

// ──────────────────────────────────────────────────────────────── transport ──

test("with no transport configured the report is acknowledged but not transmitted", () => {
  // Sentry is not integrated. The control exists and is reachable, as the
  // policy requires, and the app does not pretend to have delivered something
  // it has not.
  const r = sendReport(buildReportPayload("other", ""));
  assert.equal(r.delivered, false);
  assert.equal(r.reason, "noTransportConfigured");
});

test("a configured transport receives the payload unchanged", () => {
  const seen = [];
  const payload = buildReportPayload("offensive", "note here");
  sendReport(payload, (p) => { seen.push(p); return { delivered: true }; });
  assert.equal(seen.length, 1);
  assert.deepEqual(Object.keys(seen[0]).sort(), [...ALLOWED_PAYLOAD_KEYS].sort());
});

test("report.js contains no hardcoded network destination", () => {
  const text = src("report.js");
  const urls = text.match(/https?:\/\/[^\s"'`]+/g) ?? [];
  assert.deepEqual(urls, [], `report.js must not hardcode a destination: ${urls.join(", ")}`);
});

// ───────────────────────────────────────────────────────────────────── form ──

test("the control offers exactly the three specified reasons", () => {
  assert.deepEqual(REPORT_REASONS.map((r) => r.label),
    ["Offensive content", "Inaccurate", "Other"]);
});

test("the form renders the reason selector, the note field and the cap", () => {
  const html = renderReportForm();
  assert.match(html, /id="report-reason"/);
  assert.match(html, /id="report-note"/);
  assert.match(html, new RegExp(`maxlength="${NOTE_MAX_LENGTH}"`));
  for (const r of REPORT_REASONS) assert.ok(html.includes(r.label));
  assert.match(html, /id="report-submit"/);
});

test("the confirmation is exactly the specified wording", () => {
  assert.equal(REPORT_CONFIRMATION,
    "Thank you — your report helps us improve the experience.");
  assert.ok(renderReportConfirmation().includes(REPORT_CONFIRMATION));
});

test("the control is a Module A surface — no clinical vocabulary", () => {
  const html = renderReportButton() + renderReportForm() + renderReportConfirmation();
  for (const term of ["diagnos", "clinical", "clinician", "symptom", "medical",
    "disease", "condition", "treatment", "severity"]) {
    assert.doesNotMatch(html, new RegExp(term, "i"),
      `the report control is Module A and must not use "${term}"`);
  }
});

test("the form tells the user their photo is not included", () => {
  assert.match(renderReportForm(), /Nothing about your photo is\s+included/i);
});

// ──────────────────────────────────────────────────────────────────── wiring ─

test("the report control is rendered on the reading screen and opens in-app", () => {
  const ui = src("ui.js");
  assert.ok(ui.includes("renderReportButton()"),
    "the button must be rendered with the reading");
  assert.ok(ui.includes("wireReportControl"), "the control must be wired");
  // In-app: a dialog, not a link out.
  assert.ok(ui.includes('$("report")') && ui.includes("showModal"),
    "the form must open in-app without leaving the app");
  assert.ok(!/report[^\n]*(mailto:|window\.open|location\.href)/i.test(ui),
    "the report control must not navigate away from the app");
});

test("index.html provides the report dialog element", () => {
  assert.match(src("index.html"), /<dialog id="report">/);
});
