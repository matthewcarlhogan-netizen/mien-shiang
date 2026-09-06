/*
 * PHASE 5 — the capture-runtime pieces that MUST behave identically wherever
 * a camera loop exists in this app, factored out so beta and production stop
 * reimplementing (or, for the beta, simply lacking) the same decisions.
 *
 * Each class here mirrors GreenLatch in camera.js: a small stateful object,
 * pure and DOM-free, driven once per frame by the loop that owns the video
 * element. Nothing in this file touches a browser API directly — every
 * effect (releasing an exposure lock, calling requestCameraRefocus) is left
 * to the caller, who already owns the track/video and already has to
 * sequence it against everything else happening that frame.
 */

/**
 * The screen-assist / measurement-integrity guard.
 *
 * ── WHY A SCREEN CANNOT BE THE ILLUMINANT ───────────────────────────────────
 * The white "screen assist" is genuinely useful for finding a face in a dark
 * room, letting autofocus lock onto something, and making the preview
 * readable — but a browser cannot standardise a phone's own display
 * brightness, so light bounced off it is not a controlled illuminant the way
 * the sclera-corrected ambient reading is designed to be. If a burst were
 * allowed to complete while the assist stayed on, "the reading" would
 * silently mean "the reading, lit partly by whatever this particular phone's
 * screen happens to put out at whatever brightness the OS has it set to" —
 * which breaks comparability against every other reading in the same
 * person's history, taken without it.
 *
 * `gatesPassForHold` is the enforcement point: it returns false whenever the
 * assist is active, REGARDLESS of what the gates themselves say, so a caller
 * that feeds it (rather than the raw gate pass) into `GreenLatch.update` gets
 * the invariant for free — the hold cannot even begin to accumulate while the
 * screen is the light source, so a burst can never span both conditions.
 *
 * Every transition — turning the assist ON to help acquisition, or OFF again
 * before the real measurement — resets the hold. Turning it OFF is not "back
 * to how things were": the exposure/white-balance lock, if one was taken
 * while the assist was on, was negotiated against the WRONG illuminant and
 * must be handed back and re-negotiated once ambient light alone is what the
 * sensor sees again.
 */
export class ScreenAssistGuard {
  constructor() {
    this._active = false;
  }

  get active() {
    return this._active;
  }

  /**
   * @param {boolean} next
   * @param {{captureMode?: "auto"|"partial"|"locked"|"pending"}} [context]
   * @returns {{changed:boolean, resetHold:boolean, releaseExposureLock:boolean}}
   */
  setActive(next, { captureMode = "auto" } = {}) {
    const wasActive = this._active;
    const nextActive = Boolean(next);
    this._active = nextActive;
    if (nextActive === wasActive) {
      return { changed: false, resetHold: false, releaseExposureLock: false };
    }
    return {
      changed: true,
      resetHold: true,
      // Only meaningful when turning OFF into a lock taken while the assist
      // was on; turning ON while already auto has nothing to release. Either
      // way it is harmless to compute the same way for both directions.
      releaseExposureLock: captureMode === "locked" || captureMode === "partial",
    };
  }

  /**
   * What a caller should feed into GreenLatch.update instead of the raw gate
   * pass. The screen being the light source is disqualifying on its own,
   * independent of anything the gates measured.
   */
  gatesPassForHold(gatesPass) {
    return Boolean(gatesPass) && !this._active;
  }
}

/**
 * Persistent softness → one refocus attempt → settle → reset.
 *
 * Extracted from the production capture loop, which already got this right
 * inline (700ms of continuous `filter`-gate failure, a single
 * `requestCameraRefocus` call, reset the moment the frame is sharp again) —
 * the beta simply never had it. Kept as one small state machine so both
 * loops call the same decision rather than two copies drifting apart.
 */
export class RefocusRecovery {
  constructor({ softDurationMs = 700 } = {}) {
    this.softDurationMs = softDurationMs;
    this.softSinceMs = null;
    this.attempted = false;
  }

  /**
   * @param {{soft:boolean, nowMs:number, focusSupported:boolean}} input
   * @returns {{shouldRefocus:boolean, recovering:boolean}} `recovering` is
   *   true from the moment softness has persisted long enough to be worth
   *   naming to the user, even before the refocus call itself fires — a
   *   caller can use it to show "hold still — sharpening" a beat early.
   */
  update({ soft, nowMs, focusSupported }) {
    if (!soft) {
      this.softSinceMs = null;
      this.attempted = false;
      return { shouldRefocus: false, recovering: false };
    }
    if (this.softSinceMs === null) this.softSinceMs = nowMs;
    const persisted = nowMs - this.softSinceMs;
    const recovering = persisted >= this.softDurationMs;
    if (recovering && focusSupported && !this.attempted) {
      this.attempted = true;
      return { shouldRefocus: true, recovering: true };
    }
    return { shouldRefocus: false, recovering };
  }

  reset() {
    this.softSinceMs = null;
    this.attempted = false;
  }
}

/**
 * PHASE 11 — bounded stall tracking.
 *
 * The scanner must not leave someone staring at one sentence indefinitely.
 * This tracks how long the SAME root blocker has held the capture and
 * reports when it has persisted long enough to warrant a different,
 * recovery-flavoured message — never a gate bypass. `canUseCurrentLight` in
 * gates.js already does exactly this for light specifically (a real escape
 * hatch, at reduced confidence, only for the gates named safe to relax); this
 * generalises the DURATION tracking so a caller can decide what "still stuck
 * on the same thing" means for every other blocker too, without duplicating
 * a stopwatch per case.
 */
export class StallTracker {
  constructor({ escalateAfterMs = 6000 } = {}) {
    this.escalateAfterMs = escalateAfterMs;
    this.blockerId = null;
    this.since = null;
  }

  /**
   * @param {string|null} currentBlockerId the id of the gate/reason currently
   *   shown to the user, or null when nothing is blocking.
   * @param {number} nowMs
   * @returns {{blockerId:string|null, stalledMs:number, escalate:boolean, changed:boolean}}
   */
  update(currentBlockerId, nowMs) {
    const changed = currentBlockerId !== this.blockerId;
    if (changed) {
      this.blockerId = currentBlockerId;
      this.since = currentBlockerId === null ? null : nowMs;
    }
    const stalledMs = this.since === null ? 0 : nowMs - this.since;
    return {
      blockerId: this.blockerId,
      stalledMs,
      escalate: this.blockerId !== null && stalledMs >= this.escalateAfterMs,
      changed,
    };
  }

  reset() {
    this.blockerId = null;
    this.since = null;
  }
}
