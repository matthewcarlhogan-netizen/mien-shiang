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

export function haloStateFromCapture({ underexposed = false, gatesPass = false,
  captureSettled = false } = {}) {
  if (gatesPass && captureSettled) return "perfect";
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
