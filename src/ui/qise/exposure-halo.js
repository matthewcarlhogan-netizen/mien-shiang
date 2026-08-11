/* Passive capture-readiness halo and native-style screen-flash timing. */

export const clampExposure = (value) => Math.max(0, Math.min(1, Number(value) || 0));
export const SCREEN_FLASH_DELAY_MS = 700;

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
  let level = 0;

  const render = ({ emit = true, progressValue = null } = {}) => {
    const shown = progressValue === null ? level : clampExposure(progressValue);
    if (progress) progress.style.strokeDashoffset = String(100 - Math.round(shown * 100));
    root.style.setProperty("--halo-level", level.toFixed(3));
    if (emit) onLevel(level);
  };

  const setLevel = (next, options = {}) => {
    level = clampExposure(next);
    render(options);
    return level;
  };

  const setCaptureState = (state, holdProgress = null) => {
    root.dataset.state = state;
    render({ emit: false, progressValue: holdProgress });
  };

  root.dataset.reducedMotion = String(Boolean(reducedMotion));
  render({ emit: false });

  return {
    get level() { return level; },
    setLevel,
    setCaptureState,
    reset() {
      root.dataset.state = "seeking";
      setLevel(0);
    },
    destroy() {},
  };
}
