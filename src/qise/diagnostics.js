/*
 * PHASE 14 — development-only, non-biometric capture diagnostics.
 *
 * ── WHAT THIS IS FOR ─────────────────────────────────────────────────────
 * The one thing every defect in this correction had in common: nothing in
 * the repository could see what a real device's camera actually returned
 * (buffer dimensions, frame cadence, capability support) without a person
 * plugging the phone in and reading a debugger. This gives the NEXT device
 * test something to report back beyond "it worked" or "it didn't" — device
 * capabilities, distinct-frame throughput, time-to-milestone, and which
 * blocker held the capture and for how long.
 *
 * ── WHAT THIS IS NOT ─────────────────────────────────────────────────────
 * Not a general telemetry pipe, not always-on, and not a store. It records
 * into memory only, and only while explicitly enabled (a dev flag the
 * wiring layer gates on, e.g. a query parameter — this module has no
 * opinion on how it is enabled and reads no URL itself). NOTHING here
 * accepts a pixel, a mesh, a landmark or an image: every field is a
 * capability, a count, or a duration. `recordFrame`/`recordMilestone` take
 * a timestamp, never a frame. There is no method on this object that could
 * be handed a Uint8ClampedArray and made to keep it.
 *
 * When disabled (the default), every method is a no-op comparison and an
 * early return — a real user never pays for this file existing.
 */

const MILESTONES = Object.freeze(["firstFace", "sharp", "ready", "capture"]);

export function createDiagnosticsSession({ enabled = false } = {}) {
  const state = {
    userAgent: null,
    deviceLabel: null,
    videoWidth: null,
    videoHeight: null,
    frameRate: null,
    facingMode: null,
    focusCapabilities: null,
    exposureCapabilities: null,
    whiteBalanceCapabilities: null,
    actualTrackSettings: null,
    distinctFramesProcessed: 0,
    firstFrameAtMs: null,
    lastFrameAtMs: null,
    startedAtMs: null,
    timeToFirstFace: null,
    timeToSharp: null,
    timeToReady: null,
    timeToCapture: null,
    refocusAttempts: 0,
    screenAssistCycles: 0,
    blockerDurations: {},
    finalCaptureMode: null,
  };

  /** Capability/settings objects only — the shapes getCapabilities()/getSettings() return. */
  function recordDeviceInfo({
    userAgent = null, deviceLabel = null, videoWidth = null, videoHeight = null,
    frameRate = null, facingMode = null, focusCapabilities = null,
    exposureCapabilities = null, whiteBalanceCapabilities = null, actualTrackSettings = null,
  } = {}) {
    if (!enabled) return;
    Object.assign(state, {
      userAgent, deviceLabel, videoWidth, videoHeight, frameRate, facingMode,
      focusCapabilities, exposureCapabilities, whiteBalanceCapabilities, actualTrackSettings,
    });
  }

  function recordFrame(nowMs) {
    if (!enabled) return;
    if (state.startedAtMs === null) state.startedAtMs = nowMs;
    if (state.firstFrameAtMs === null) state.firstFrameAtMs = nowMs;
    state.lastFrameAtMs = nowMs;
    state.distinctFramesProcessed += 1;
  }

  /** @param {"firstFace"|"sharp"|"ready"|"capture"} name */
  function recordMilestone(name, nowMs) {
    if (!enabled) return;
    if (!MILESTONES.includes(name)) {
      throw new RangeError(`unknown milestone "${name}" — expected one of ${MILESTONES.join(", ")}`);
    }
    const key = `timeTo${name[0].toUpperCase()}${name.slice(1)}`;
    if (state[key] === null) {
      state[key] = state.startedAtMs === null ? nowMs : nowMs - state.startedAtMs;
    }
  }

  function recordRefocusAttempt() {
    if (!enabled) return;
    state.refocusAttempts += 1;
  }

  function recordScreenAssistCycle() {
    if (!enabled) return;
    state.screenAssistCycles += 1;
  }

  function recordBlockerMs(blockerId, deltaMs) {
    if (!enabled || !blockerId || !(deltaMs > 0)) return;
    state.blockerDurations[blockerId] = (state.blockerDurations[blockerId] || 0) + deltaMs;
  }

  function setFinalCaptureMode(mode) {
    if (!enabled) return;
    state.finalCaptureMode = mode;
  }

  function summary() {
    const elapsedMs = state.firstFrameAtMs !== null && state.lastFrameAtMs !== null
      ? state.lastFrameAtMs - state.firstFrameAtMs
      : null;
    const distinctFrameRate = elapsedMs && elapsedMs > 0
      ? (state.distinctFramesProcessed - 1) / (elapsedMs / 1000)
      : null;
    return {
      userAgent: state.userAgent,
      deviceLabel: state.deviceLabel,
      videoWidth: state.videoWidth,
      videoHeight: state.videoHeight,
      frameRate: state.frameRate,
      facingMode: state.facingMode,
      focusCapabilities: state.focusCapabilities,
      exposureCapabilities: state.exposureCapabilities,
      whiteBalanceCapabilities: state.whiteBalanceCapabilities,
      actualTrackSettings: state.actualTrackSettings,
      distinctFramesProcessed: state.distinctFramesProcessed,
      distinctFrameRate,
      timeToFirstFace: state.timeToFirstFace,
      timeToSharp: state.timeToSharp,
      timeToReady: state.timeToReady,
      timeToCapture: state.timeToCapture,
      refocusAttempts: state.refocusAttempts,
      screenAssistCycles: state.screenAssistCycles,
      blockerDurations: { ...state.blockerDurations },
      finalCaptureMode: state.finalCaptureMode,
    };
  }

  return {
    enabled,
    recordDeviceInfo,
    recordFrame,
    recordMilestone,
    recordRefocusAttempt,
    recordScreenAssistCycle,
    recordBlockerMs,
    setFinalCaptureMode,
    summary,
  };
}

/**
 * Whether the diagnostics session should be enabled, from a URLSearchParams
 * (or anything with a compatible `.has`/`.get`) — reading the URL is the
 * caller's job, this only names the flag: `?devtelemetry=1` or `?captdbg=1`.
 * Kept as one named function so the flag string exists in exactly one place.
 *
 * Deliberately NOT named `diagnostics`/`diag` as a URL flag: item 19's
 * blocklist exists to keep TGA exclusion 14B available, and a shipped string
 * containing "diagnos" is exactly the class of word it exists to catch —
 * whether or not this particular instance was ever prose a reader would see.
 * Cheaper to avoid the word entirely than to argue a query-string key is not
 * "shipped".
 */
export function diagnosticsRequested(searchParams) {
  if (!searchParams || typeof searchParams.has !== "function") return false;
  return searchParams.has("devtelemetry") || searchParams.has("captdbg");
}
