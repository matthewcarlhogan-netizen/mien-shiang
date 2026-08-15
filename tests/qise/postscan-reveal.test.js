import test from "node:test";
import assert from "node:assert/strict";

import {
  createPostScanReveal,
  createPostScanRevealState,
  POST_SCAN_REVEAL_STAGES,
  reducePostScanReveal,
} from "../../src/ui/qise/postscan-reveal.js";

const statusOf = (state) => Object.fromEntries(
  state.stages.map((stage) => [stage.id, stage.status]),
);

test("production events activate and complete stages in order", () => {
  const events = [];
  const reveal = createPostScanReveal({ onChange: (state) => events.push(state) });

  reveal.begin();
  assert.equal(reveal.state.stages[0].status, "active");
  reveal.completeStage("capture-quality", "Accepted capture · clean light");
  assert.equal(reveal.state.stages[1].status, "active");
  reveal.completeStage("eligible-regions", "6 approved regions used for this reading.", [
    "tian", "quan_l", "quan_r", "dige", "not-an-approved-region",
  ]);
  assert.deepEqual(reveal.state.visibleRegions, ["tian", "quan_l", "quan_r", "dige"]);
  reveal.completeStage("personal-history", "Compared with your own earlier readings.");
  assert.equal(reveal.state.stages[3].status, "active");
  reveal.completeStage("reflection-assembly", "Reflection assembled on-device.");

  assert.equal(reveal.state.status, "complete");
  assert.equal(reveal.state.outcome, "complete");
  assert.deepEqual(statusOf(reveal.state), {
    "capture-quality": "complete",
    "eligible-regions": "complete",
    "personal-history": "complete",
    "reflection-assembly": "complete",
  });
  assert.equal(events.length, 5, "only named state transitions publish updates");
});

test("calibrating runs omit the ineligible personal-history stage", () => {
  let state = createPostScanRevealState();
  state = reducePostScanReveal(state, { type: "BEGIN" });
  state = reducePostScanReveal(state, { type: "COMPLETE_STAGE", stageId: "capture-quality" });
  state = reducePostScanReveal(state, {
    type: "COMPLETE_STAGE", stageId: "eligible-regions", regionIds: ["tian"],
  });
  state = reducePostScanReveal(state, {
    type: "SKIP_STAGE", stageId: "personal-history", reason: "Personal comparison will begin after more scans.",
  });

  assert.equal(state.stages[2].status, "skipped");
  assert.equal(state.stages[3].status, "active");
  state = reducePostScanReveal(state, { type: "COMPLETE_STAGE", stageId: "reflection-assembly" });
  assert.equal(state.status, "complete");
});

test("a fast run has no timer, percentage or minimum-duration state", () => {
  const reveal = createPostScanReveal();
  reveal.begin();
  reveal.completeStage("capture-quality");
  reveal.completeStage("eligible-regions", undefined, ["tian", "yintang"]);
  reveal.completeStage("personal-history");
  reveal.completeStage("reflection-assembly");

  const serialised = JSON.stringify(reveal.state).toLowerCase();
  assert.doesNotMatch(serialised, /progress|percent|countdown|duration|timeout|delay/);
  assert.deepEqual(reveal.state.visibleRegions, ["tian", "yintang"]);
});

test("errors, cancellation and backgrounding stop the active stage without reopening capture data", () => {
  for (const event of [
    { type: "FAIL", message: "The on-device reading stopped." },
    { type: "ABSTAIN", message: "Not enough approved evidence." },
    { type: "CANCEL", message: "The scan was cancelled." },
    { type: "BACKGROUND", message: "The scan was cleared in the background." },
  ]) {
    let state = createPostScanRevealState();
    state = reducePostScanReveal(state, { type: "BEGIN" });
    state = reducePostScanReveal(state, event);
    assert.equal(state.stages[0].status, "stopped");
    assert.equal(state.status, event.type === "ABSTAIN"
      ? "abstained"
      : event.type === "CANCEL" ? "cancelled" : event.type === "BACKGROUND" ? "backgrounded" : "error");
    assert.deepEqual(state.visibleRegions, []);
    assert.equal("landmarks" in state, false);
    assert.equal("points" in state, false);
    assert.equal("image" in state, false);
  }
});

test("reduced motion is a state-change mode, not a second event sequence", () => {
  const changes = [];
  const reveal = createPostScanReveal({ reducedMotion: true, onChange: (state) => changes.push(state) });
  reveal.begin();
  reveal.completeStage("capture-quality");
  reveal.completeStage("eligible-regions", undefined, ["periorbital"]);
  reveal.skipStage("personal-history");
  reveal.completeStage("reflection-assembly");

  assert.equal(reveal.state.reducedMotion, true);
  assert.equal(changes.length, POST_SCAN_REVEAL_STAGES.length + 1);
  assert.equal(reveal.state.visibleRegions[0], "periorbital");
});
