/*
 * PHASE 0 LIGHT-PROBE — rejection attribution.
 *
 * requirement 4.4: a rejected frame/pair is attributed to exactly one of
 * three causes, so "no pairs survived" can be diagnosed instead of just
 * reported. Order matters -- these are checked in the order below, most
 * specific/earliest-in-the-pipeline cause first, because a frame inside the
 * warm-up window that ALSO happens to look drifted is a warm-up rejection,
 * not a drift rejection: nothing about it should have been trusted regardless
 * of its drift number.
 *
 *   warmUp     -- frame fell inside EXPOSURE_WARMUP_MS (see camera.js). The
 *                 sensor/AE had not settled; the frame was never a candidate.
 *   incomplete -- the lamp's on/off SCHEDULE never actually flipped during
 *                 this window, so there is no lit/unlit pair to form at all.
 *                 This is an instrumentation fault (the block-wise driver
 *                 didn't run, or ran too slowly for the window), not
 *                 something about the subject.
 *   drift      -- a candidate pair existed and was measured, but failed
 *                 pairDrift() (retest.js) -- the subject/mesh moved between
 *                 the two legs, so the pair was discarded as comparing two
 *                 different patches of skin.
 *
 * "No pairs" (requirement 4.4, second sentence) must not collapse `incomplete`
 * and `drift` into one undifferentiated empty result: one means "the
 * instrument never produced a pair to test" (schedule fault), the other means
 * "pairs were produced and every one of them moved too much" (face moved).
 * Conflating them is the same mistake CLAUDE.md item 23 documents for
 * `zoneNotExtracted` vs `colourNotMeasurable` -- two different bugs made to
 * look like one silence.
 */

export const REJECTION_CAUSES = Object.freeze(["warmUp", "drift", "incomplete"]);

/**
 * event: { withinWarmUp: boolean, scheduleFlipped: boolean, driftDiscarded: boolean }
 * Returns one of REJECTION_CAUSES, or null if the event was not rejected.
 */
export function attributeRejection(event) {
  if (!event) return null;
  if (event.withinWarmUp) return "warmUp";
  if (!event.scheduleFlipped) return "incomplete";
  if (event.driftDiscarded) return "drift";
  return null;
}

/** Tally rejection events by cause. Every cause is present, even at zero. */
export function tallyRejections(events) {
  const tally = { warmUp: 0, drift: 0, incomplete: 0 };
  for (const event of events || []) {
    const cause = attributeRejection(event);
    if (cause) tally[cause] += 1;
  }
  return tally;
}

/**
 * requirement 4.4: when zero pairs survive, say which of the two distinct
 * "no pairs" stories happened. Returns a stable string, not a boolean, so a
 * report can print it directly.
 */
export function noPairsReason(tally) {
  const drift = tally?.drift ?? 0;
  const incomplete = tally?.incomplete ?? 0;
  if (drift === 0 && incomplete === 0) return "unknown";
  if (drift > 0 && incomplete === 0) return "face_moved";
  if (incomplete > 0 && drift === 0) return "schedule_never_flipped";
  return "mixed";
}
