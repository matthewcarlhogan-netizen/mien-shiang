/*
 * PHASE 0 LIGHT-PROBE — lock-state verification.
 *
 * ── WHY THIS FILE DOES NOT REIMPLEMENT applyConstraints() -> getSettings() ──
 * src/qise/camera.js:negotiateCaptureMode() already does exactly what the
 * probe needs: request "manual" white-balance/exposure, then read back what
 * actually stuck via getSettings() rather than trusting a resolved promise.
 * That function is the load-bearing verification pattern (a resolved
 * applyConstraints() is not evidence a constraint was honoured -- Chromium
 * silently strips unsupported constraints instead of rejecting them). Writing
 * a second copy here would be exactly the hazard CLAUDE.md item 47 describes:
 * two copies of one piece of physics that can silently drift apart. The probe
 * imports and reuses it instead.
 *
 * This module adds only what negotiateCaptureMode() does not already report:
 * a human-readable lock-state label, and the REQUESTED-vs-RETURNED mismatch
 * list a probe run needs to print before any ROI verdict.
 */
import { negotiateCaptureMode } from "../src/qise/camera.js";

export { negotiateCaptureMode };

/** The three lock states negotiateCaptureMode() can report. */
export const LOCK_STATES = Object.freeze(["locked", "partial", "auto"]);

/**
 * Fields Chromium's getCapabilities() advertised as manually settable
 * (negotiateCaptureMode's `requested`) that did NOT come back as "manual"
 * from getSettings() after applyConstraints() (`locked`).
 *
 * This is the "advertised but silently ignored" case from requirement 1.5:
 * a constraint Chromium claims to support in getCapabilities() but strips
 * anyway must be visible as a named mismatch, not folded into "auto" with no
 * detail on which field misbehaved.
 */
export function fieldMismatches({ requested, locked }) {
  const lockedSet = new Set(locked || []);
  return (requested || []).filter((field) => !lockedSet.has(field));
}

/** The prefix every ROI verdict must carry when lock state is "auto". */
export const LOCK_UNVERIFIED_PREFIX = "LOCK_UNVERIFIED";

/**
 * Run the negotiation and package everything a probe report needs about it:
 * the lock state, which fields were requested vs. which actually locked, the
 * mismatch list, and whether ROI verdicts must be marked unverified.
 *
 * requirement 1.3 is deliberately narrow: only "auto" (nothing locked at all)
 * forces the LOCK_UNVERIFIED prefix and the lampSnr-not-interpretable note.
 * "partial" (e.g. exposure locked but white balance not) is a real, distinct
 * state -- it is still fully reported via `mismatches`, but it does not by
 * itself invalidate lampSnr the way a fully free-running AWB loop does. Do
 * not widen this to cover "partial" without re-reading requirement 1.3: that
 * would be silently expanding what the spec asked to gate on.
 */
export async function probeLockState(track) {
  const result = await negotiateCaptureMode(track);
  const mismatches = fieldMismatches(result);
  return {
    ...result,
    mismatches,
    unverified: result.captureMode === "auto",
  };
}

/**
 * Prefix a single ROI verdict string when the run's lock state was "auto".
 * Requirement 1.3: EVERY ROI verdict, not a run-level note alone -- someone
 * reading one ROI's line in isolation (a screenshot, a copy-pasted row) must
 * not be able to lose the caveat by dropping the header.
 */
export function prefixVerdict(verdictText, unverified) {
  return unverified ? `${LOCK_UNVERIFIED_PREFIX} ${verdictText}` : verdictText;
}

/** The run-summary sentence required by 1.3 when lock state is "auto". */
export const LOCK_UNVERIFIED_SUMMARY =
  "lampSnr is not interpretable: white balance was not locked, so an ISP " +
  "feedback loop may be competing with the lamp rather than the lamp being " +
  "measured against a fixed reference.";
