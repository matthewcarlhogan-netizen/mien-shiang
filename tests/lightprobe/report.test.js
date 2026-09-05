import { test } from "node:test";
import assert from "node:assert/strict";
import { roiVerdict, buildReport, formatReport, LAMP_SNR_MIN, ABSOLUTE_COLOUR_CLAIMED } from "../../lightprobe/report.js";

const LOCKED = { captureMode: "locked", requested: ["whiteBalanceMode", "exposureMode"], locked: ["whiteBalanceMode", "exposureMode"], mismatches: [], unverified: false };
const AUTO = { captureMode: "auto", requested: ["whiteBalanceMode", "exposureMode"], locked: [], mismatches: ["whiteBalanceMode", "exposureMode"], unverified: true };

function goodRoiInput(name = "center_forehead") {
  return {
    roiName: name,
    litSamples: [140, 141, 139, 140.5, 139.5, 140.2, 139.8, 140.1],
    unlitSamples: [100, 101, 99, 100.5, 99.5, 100.2, 99.8, 100.1],
    litLab: { L: 62, a: 4, b: 12 },
    unlitLab: { L: 58, a: 4.1, b: 11.9 },
    lStarsAcrossRepeats: [62, 62.1, 61.9, 62.0, 62.05],
    varianceRatio: 0.9,
  };
}

/* ── requirement 4.1: lampSnr is gated BEFORE the variance ratio. A shadowed
 * ROI with an excellent variance ratio but a bad lampSnr must still FAIL. */

test("an excellent variance ratio cannot rescue an ROI whose lampSnr is below threshold", () => {
  const input = goodRoiInput("shadowed_zone");
  // Force lampSnr low by making the lit/unlit means nearly identical (no real
  // lamp signal), while keeping a suspiciously good varianceRatio -- exactly
  // the "shadowed ROI, excellent ratio" case the ordering exists for.
  input.litSamples = [100.1, 100.0, 99.9, 100.2, 100.0, 99.8, 100.1, 100.0];
  input.varianceRatio = 0.98;
  const verdict = roiVerdict(input, { unverified: false });
  assert.ok(verdict.lampSnr < LAMP_SNR_MIN, "fixture must actually produce a low lampSnr");
  assert.equal(verdict.verdict, "FAIL");
});

test("a good lampSnr and a good variance ratio together PASS", () => {
  const verdict = roiVerdict(goodRoiInput(), { unverified: false });
  assert.ok(verdict.lampSnr >= LAMP_SNR_MIN, "fixture must actually clear the threshold");
  assert.equal(verdict.verdict, "PASS");
});

test("the verdict text names lampSnr before the variance ratio, matching gate order", () => {
  const verdict = roiVerdict(goodRoiInput(), { unverified: false });
  assert.ok(verdict.text.indexOf("lampSnr=") < verdict.text.indexOf("varianceRatio="));
});

/* ── requirement 4.2: per-ROI only, never a whole-face aggregate. ── */

test("buildReport's shape has no whole-face aggregate field anywhere", () => {
  const report = buildReport({
    lockState: LOCKED,
    roiInputs: [goodRoiInput("center_forehead"), goodRoiInput("chin")],
    rejectionTally: { warmUp: 0, drift: 0, incomplete: 0 },
    noPairsReason: null,
    synthetic: true,
  });
  const json = JSON.stringify(report).toLowerCase();
  for (const forbidden of ["wholeface", "whole_face", "faceaverage", "face_average", "aggregate"]) {
    assert.ok(!json.includes(forbidden), `report must not contain a whole-face aggregate field (${forbidden})`);
  }
  assert.equal(report.rois.length, 2);
  assert.ok(report.rois.every((r) => typeof r.roi === "string"));
});

/* ── requirement 4.5: absoluteColourClaimed hard-wired false, always. ── */

test("ABSOLUTE_COLOUR_CLAIMED is the literal false, not computed from any input", () => {
  assert.equal(ABSOLUTE_COLOUR_CLAIMED, false);
});

test("absoluteColourClaimed stays false even when a reference/lock state is present", () => {
  const report = buildReport({
    lockState: LOCKED,
    roiInputs: [goodRoiInput()],
    rejectionTally: { warmUp: 0, drift: 0, incomplete: 0 },
    noPairsReason: null,
    synthetic: true,
  });
  assert.equal(report.absoluteColourClaimed, false);
});

/* ── requirement 1.3: every ROI verdict prefixed under auto lock state; the
 * run summary states lampSnr is not interpretable. ── */

test("under auto lock state, every ROI's verdict text is prefixed LOCK_UNVERIFIED", () => {
  const report = buildReport({
    lockState: AUTO,
    roiInputs: [goodRoiInput("center_forehead"), goodRoiInput("chin")],
    rejectionTally: { warmUp: 0, drift: 0, incomplete: 0 },
    noPairsReason: null,
    synthetic: true,
  });
  assert.ok(report.rois.every((r) => r.text.startsWith("LOCK_UNVERIFIED")));
  assert.ok(report.unverifiedSummary && /not interpretable/.test(report.unverifiedSummary));
});

test("under locked state, no ROI verdict is prefixed and there is no unverified summary", () => {
  const report = buildReport({
    lockState: LOCKED,
    roiInputs: [goodRoiInput("center_forehead")],
    rejectionTally: { warmUp: 0, drift: 0, incomplete: 0 },
    noPairsReason: null,
    synthetic: true,
  });
  assert.ok(report.rois.every((r) => !r.text.startsWith("LOCK_UNVERIFIED")));
  assert.equal(report.unverifiedSummary, null);
});

/* ── requirement 1.2: lock state printed prominently, once, BEFORE any ROI verdict. ── */

test("formatReport prints the lock state as the very first line, before every ROI line", () => {
  const report = buildReport({
    lockState: AUTO,
    roiInputs: [goodRoiInput("center_forehead"), goodRoiInput("chin")],
    rejectionTally: { warmUp: 1, drift: 0, incomplete: 0 },
    noPairsReason: null,
    synthetic: true,
  });
  const text = formatReport(report);
  const lines = text.split("\n");
  assert.ok(lines[0].startsWith("LOCK STATE:"));
  const firstRoiLineIndex = lines.findIndex((l) => l.includes("center_forehead:"));
  assert.ok(firstRoiLineIndex > 0, "an ROI line must exist");
  assert.equal(lines.filter((l) => l.startsWith("LOCK STATE:")).length, 1, "lock state must appear exactly once");
});

test("formatReport marks a synthetic report as SYNTHETIC in its output", () => {
  const report = buildReport({
    lockState: LOCKED, roiInputs: [goodRoiInput()], rejectionTally: { warmUp: 0, drift: 0, incomplete: 0 }, noPairsReason: null, synthetic: true,
  });
  assert.ok(formatReport(report).includes("SYNTHETIC"));
});
