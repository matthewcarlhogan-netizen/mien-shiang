import { test } from "node:test";
import assert from "node:assert/strict";
import { attributeRejection, tallyRejections, noPairsReason } from "../../lightprobe/rejections.js";

test("a frame inside the warm-up window is attributed to warmUp even if it also looks drifted", () => {
  const cause = attributeRejection({ withinWarmUp: true, scheduleFlipped: true, driftDiscarded: true });
  assert.equal(cause, "warmUp");
});

test("a window where the lamp schedule never flipped is attributed to incomplete", () => {
  const cause = attributeRejection({ withinWarmUp: false, scheduleFlipped: false, driftDiscarded: false });
  assert.equal(cause, "incomplete");
});

test("a measured pair that failed pairDrift is attributed to drift", () => {
  const cause = attributeRejection({ withinWarmUp: false, scheduleFlipped: true, driftDiscarded: true });
  assert.equal(cause, "drift");
});

test("an event that was not rejected returns null, not a fabricated cause", () => {
  const cause = attributeRejection({ withinWarmUp: false, scheduleFlipped: true, driftDiscarded: false });
  assert.equal(cause, null);
});

test("tallyRejections always reports all three causes, even at zero, so a report cannot omit an empty bucket", () => {
  const tally = tallyRejections([]);
  assert.deepEqual(tally, { warmUp: 0, drift: 0, incomplete: 0 });
});

test("tallyRejections counts each event under exactly one cause", () => {
  const tally = tallyRejections([
    { withinWarmUp: true, scheduleFlipped: true, driftDiscarded: false },
    { withinWarmUp: false, scheduleFlipped: false, driftDiscarded: false },
    { withinWarmUp: false, scheduleFlipped: true, driftDiscarded: true },
    { withinWarmUp: false, scheduleFlipped: true, driftDiscarded: true },
  ]);
  assert.deepEqual(tally, { warmUp: 1, drift: 2, incomplete: 1 });
});

/* requirement 4.4's specific ask: "no pairs" must distinguish "face moved"
 * from "schedule never flipped". These are the two single-cause scenarios,
 * and a mixed one, kept apart rather than collapsed into one string. */

test("noPairsReason reports 'face_moved' when every rejection was drift, none incomplete", () => {
  assert.equal(noPairsReason({ warmUp: 0, drift: 4, incomplete: 0 }), "face_moved");
});

test("noPairsReason reports 'schedule_never_flipped' when every rejection was incomplete, none drift", () => {
  assert.equal(noPairsReason({ warmUp: 0, drift: 0, incomplete: 4 }), "schedule_never_flipped");
});

test("noPairsReason reports 'mixed' rather than picking one story when both occurred", () => {
  assert.equal(noPairsReason({ warmUp: 0, drift: 2, incomplete: 2 }), "mixed");
});

test("noPairsReason reports 'unknown' when neither drift nor incomplete accounts for the empty result", () => {
  assert.equal(noPairsReason({ warmUp: 4, drift: 0, incomplete: 0 }), "unknown");
});
