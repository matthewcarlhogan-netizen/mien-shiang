/*
 * Passive capture-readiness halo.
 *
 * Light is controlled by a clearly labelled button below the preview. The halo
 * only reflects screen-light strength and validated hold progress; turning the
 * whole camera image into an invisible slider made accidental changes easy and
 * gave no useful clue for uneven side light.
 */

export const clampExposure = (value) => Math.max(0, Math.min(1, Number(value) || 0));
export const SCREEN_FLASH_DELAY_MS = 700;
export const SCREEN_FLASH_MAX_ON_MS = 6000;

/** Camera-app-style auto flash after a real problem persists, never on a one-frame wobble. */
export function shouldUseScreenFlash({
  issuePresent = false, issueForMs = 0, enabled = false,
  dismissed = false, illuminationActive = false,
} = {}) {
  return issuePresent
    && issueForMs >= SCREEN_FLASH_DELAY_MS
    && !enabled
    && !dismissed
    && !illuminationActive;
}

/**
 * When the assist may be dropped again.
 *
 * The release condition is "the DARKNESS that armed it has gone", never "every
 * gate is green". Requiring a full pass is a closed loop: the assist
 * disqualifies the hold on its own (`ScreenAssistGuard.gatesPassForHold`), so
 * the only way out is a pass — and any gate the assist does not fix holds the
 * assist on, which keeps the hold blocked, forever. Uneven side light is the
 * one that actually did it: a screen flash moves WITH the phone, so it cannot
 * make one cheek match the other, and the frame it produces is worse. Measured
 * on a real handset against the same face seconds apart, inside the guide
 * oval: with the assist on, p99 face luma 253 and max 255 with 1.6% of skin
 * pixels at or above the 250 clip point; the native camera in the same room,
 * no assist, p99 210, max 240, 0.0% clipped.
 *
 * `activeForMs` is the backstop, and it is not redundant with the condition
 * above: no gate added later can wedge the assist on, whatever it measures.
 * A caller dropping on the cap should also stop auto-arming — in a room that
 * stays too dark, re-arming every 700ms is a flashing screen that still cannot
 * produce a reading, because locked decision 3 forbids a burst under the
 * assist whatever the gates say. Saying "too dark" once is the honest answer.
 */
export function shouldDropScreenFlash({
  enabled = false, clearHeld = false, activeForMs = 0, illuminationActive = false,
} = {}) {
  if (!enabled || illuminationActive) return false;
  return Boolean(clearHeld) || activeForMs >= SCREEN_FLASH_MAX_ON_MS;
}

/** True when the drop was forced by the cap rather than by the scene improving. */
export function screenFlashCapReached({ enabled = false, activeForMs = 0 } = {}) {
  return Boolean(enabled) && activeForMs >= SCREEN_FLASH_MAX_ON_MS;
}

export function haloStateFromCapture({ underexposed = false, gatesPass = false,
  captureSettled = false, recovering = false } = {}) {
  if (gatesPass && captureSettled) return "perfect";
  // Checked before `underexposed`: a soft frame recovering from autofocus is
  // a DIFFERENT actionable state ("hold still — sharpening") from a dark one
  // ("add light"), and conflating them under one colour would tell the user
  // to fix the wrong thing while the app is already acting on the real one.
  if (recovering) return "recovering";
  if (underexposed) return "adjust";
  return "seeking";
}

export function createExposureHalo({ root, onLevel = () => {}, reducedMotion = false } = {}) {
  if (!root) throw new TypeError("createExposureHalo requires a root element");
  const progress = root.querySelector("[data-halo-progress]");
  const valueLabel = root.querySelector("[data-halo-value]");
  let level = 0;

  const render = ({ emit = true, progressValue = null } = {}) => {
    const shown = progressValue === null ? level : clampExposure(progressValue);
    if (progress) progress.style.strokeDashoffset = String(100 - Math.round(shown * 100));
    root.style.setProperty("--halo-level", level.toFixed(3));
    if (valueLabel) valueLabel.textContent = level > 0
      ? `${Math.round(level * 100)}% light`
      : "Slide up for light";
    if (emit) onLevel(level);
  };

  const setLevel = (next, options = {}) => {
    level = clampExposure(next);
    render(options);
    return level;
  };

  const setCaptureState = (state, holdProgress = null) => {
    root.dataset.state = state;
    if (state === "perfect") {
      render({ emit: false, progressValue: holdProgress ?? 1 });
      if (valueLabel) valueLabel.textContent = "Perfect light — hold still";
    } else {
      if (valueLabel && level === 0 && state === "adjust") {
        valueLabel.textContent = "Too dark — slide up";
      }
      render({ emit: false, progressValue: holdProgress });
    }
  };

  root.dataset.reducedMotion = String(Boolean(reducedMotion));
  render({ emit: false });

  return {
    get level() { return level; },
    setLevel,
    setCaptureState,
    reset() {
      root.dataset.state = "seeking";
      root.dataset.dragging = "false";
      setLevel(0);
    },
    destroy() {},
  };
}
