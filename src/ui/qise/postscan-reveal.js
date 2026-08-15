/*
 * Post-scan reveal state and view.
 *
 * The reveal is intentionally a small, evidence-shaped state machine. It
 * receives named production events from app.js, never a frame, landmark
 * array, canvas, pixel sample or measurement payload. The field below is a
 * canonical diagram of approved Qi Se regions, not a projection of a face.
 */

export const POST_SCAN_REVEAL_STAGES = Object.freeze([
  Object.freeze({ id: "capture-quality", label: "Capture quality" }),
  Object.freeze({ id: "eligible-regions", label: "Eligible regions" }),
  Object.freeze({ id: "personal-history", label: "Your own history" }),
  Object.freeze({ id: "reflection-assembly", label: "Reflection assembly" }),
]);

const STAGE_IDS = new Set(POST_SCAN_REVEAL_STAGES.map((stage) => stage.id));

/** The only field marks this screen may reveal. They are approved Qi Se ROIs. */
export const POST_SCAN_REVEAL_REGIONS = Object.freeze({
  tian: Object.freeze({
    label: "Upper court", points: Object.freeze([[50, 17], [44, 20], [56, 20]]),
    shape: "M43 18 Q50 14 57 18 L55 23 Q50 21 45 23 Z",
  }),
  yintang: Object.freeze({
    label: "Between the brows", points: Object.freeze([[50, 29], [46, 32], [54, 32]]),
    shape: "M45 28 Q50 25 55 28 L54 34 Q50 32 46 34 Z",
  }),
  shangen: Object.freeze({
    label: "Root of the nose", points: Object.freeze([[50, 39], [47, 43], [53, 43]]),
    shape: "M47 37 L53 37 L54 46 L46 46 Z",
  }),
  zhuntou: Object.freeze({
    label: "Tip of the nose", points: Object.freeze([[50, 51], [46, 54], [54, 54]]),
    shape: "M45 49 Q50 46 55 49 L55 56 Q50 59 45 56 Z",
  }),
  quan_l: Object.freeze({
    label: "Cheekbone, anatomical left", points: Object.freeze([[28, 40], [31, 44], [34, 42]]),
    shape: "M24 38 Q30 35 36 39 L34 46 Q28 47 24 43 Z",
  }),
  quan_r: Object.freeze({
    label: "Cheekbone, anatomical right", points: Object.freeze([[72, 40], [69, 44], [66, 42]]),
    shape: "M64 39 Q70 35 76 38 L76 43 Q72 47 66 46 Z",
  }),
  dige: Object.freeze({
    label: "Lower court", points: Object.freeze([[50, 69], [45, 72], [55, 72]]),
    shape: "M43 67 Q50 72 57 67 L55 76 Q50 79 45 76 Z",
  }),
  periorbital: Object.freeze({
    label: "Under the eyes", points: Object.freeze([[29, 30], [70, 34]]),
    shape: "M23 28 L36 27 L41 31 L34 35 L22 33 Z M60 32 L69 29 L78 34 L72 37 L61 36 Z",
  }),
});

const REGION_IDS = new Set(Object.keys(POST_SCAN_REVEAL_REGIONS));

const COPY = Object.freeze({
  active: "The reading is taking shape from this scan.",
  complete: "The reading is ready.",
  error: "The reading could not be completed from this scan.",
  abstained: "This scan did not provide enough eligible evidence.",
  cancelled: "The scan was cleared before the reading was finished.",
  backgrounded: "The scan was cleared when this tab went into the background.",
});

const clone = (value) => (typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

function stages() {
  return POST_SCAN_REVEAL_STAGES.map((stage, index) => ({
    ...stage,
    status: index === 0 ? "pending" : "pending",
    detail: null,
  }));
}

export function createPostScanRevealState({ reducedMotion = false } = {}) {
  return {
    status: "idle",
    reducedMotion: Boolean(reducedMotion),
    stages: stages(),
    visibleRegions: [],
    message: "",
    outcome: null,
  };
}

function currentStageIndex(state) {
  return state.stages.findIndex((stage) => stage.status === "active");
}

function firstPendingIndex(state) {
  return state.stages.findIndex((stage) => stage.status === "pending");
}

function activateNext(next) {
  const index = firstPendingIndex(next);
  if (index === -1) {
    next.status = "complete";
    next.message = COPY.complete;
    next.outcome = "complete";
    return next;
  }
  next.stages[index].status = "active";
  return next;
}

function stageIndexFor(state, stageId) {
  return state.stages.findIndex((stage) => stage.id === stageId);
}

function validRegions(regionIds) {
  if (!Array.isArray(regionIds)) return [];
  return [...new Set(regionIds)].filter((id) => REGION_IDS.has(id));
}

function withStageDetail(stage, detail) {
  if (typeof detail !== "string" || !detail.trim()) return;
  stage.detail = detail.trim().slice(0, 120);
}

/**
 * Pure event reducer. Events are deliberately named after production facts,
 * not animation ticks or elapsed time.
 */
export function reducePostScanReveal(state, event) {
  const next = clone(state);
  const type = event?.type;

  if (type === "BEGIN") {
    if (next.status !== "idle") return next;
    next.status = "active";
    next.message = COPY.active;
    next.stages[0].status = "active";
    return next;
  }

  if (type === "COMPLETE_STAGE") {
    if (next.status !== "active" || !STAGE_IDS.has(event.stageId)) return next;
    const index = stageIndexFor(next, event.stageId);
    if (index === -1 || next.stages[index].status !== "active") return next;
    next.stages[index].status = "complete";
    withStageDetail(next.stages[index], event.detail);
    if (event.stageId === "eligible-regions") next.visibleRegions = validRegions(event.regionIds);
    next.message = event.detail || next.stages[index].label;
    return activateNext(next);
  }

  if (type === "SKIP_STAGE") {
    if (next.status !== "active" || !STAGE_IDS.has(event.stageId)) return next;
    const index = stageIndexFor(next, event.stageId);
    if (index === -1 || next.stages[index].status !== "active") return next;
    next.stages[index].status = "skipped";
    withStageDetail(next.stages[index], event.reason || "Not used for this reading.");
    next.message = event.reason || `${next.stages[index].label} not used for this reading.`;
    return activateNext(next);
  }

  if (["FAIL", "ABSTAIN", "CANCEL", "BACKGROUND"].includes(type)) {
    if (next.status !== "active") return next;
    const active = currentStageIndex(next);
    if (active !== -1) next.stages[active].status = "stopped";
    const outcome = type === "ABSTAIN"
      ? "abstained"
      : type === "BACKGROUND" ? "backgrounded" : type === "CANCEL" ? "cancelled" : "error";
    next.status = outcome;
    next.outcome = outcome;
    next.message = String(event.message || COPY[outcome] || COPY.error).slice(0, 180);
    return next;
  }

  return next;
}

export function createPostScanReveal({ reducedMotion = false, onChange = () => {} } = {}) {
  let state = createPostScanRevealState({ reducedMotion });
  const publish = (event) => {
    state = reducePostScanReveal(state, event);
    onChange(clone(state));
    return clone(state);
  };
  return {
    get state() { return clone(state); },
    begin: () => publish({ type: "BEGIN" }),
    completeStage: (stageId, detail, regionIds) => publish({
      type: "COMPLETE_STAGE", stageId, detail, regionIds,
    }),
    skipStage: (stageId, reason) => publish({ type: "SKIP_STAGE", stageId, reason }),
    fail: (message) => publish({ type: "FAIL", message }),
    abstain: (message) => publish({ type: "ABSTAIN", message }),
    cancel: (message) => publish({ type: "CANCEL", message }),
    background: (message) => publish({ type: "BACKGROUND", message }),
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}

function fieldSvg(visibleRegions) {
  const marks = visibleRegions.map((id) => {
    const region = POST_SCAN_REVEAL_REGIONS[id];
    const points = region.points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.15" />`).join("");
    return `<g data-region-id="${esc(id)}" aria-label="${esc(region.label)}" class="postscan-region">
      <path d="${region.shape}" />${points}
    </g>`;
  }).join("");
  return `<svg class="postscan-field" viewBox="0 0 100 100" role="img"
    aria-label="Abstract measurement field; only eligible regions are marked">
    <path class="postscan-field-boundary" d="M15 17 Q29 8 43 13 T69 10 Q78 12 86 22 M14 38 Q27 31 39 36 T65 32 Q77 34 86 42 M11 58 Q25 52 37 59 T63 54 Q76 56 88 64 M21 82 Q32 72 45 79 T70 76 Q78 79 82 87" />
    <path class="postscan-field-axis" d="M51 11 Q47 28 53 42 T48 61 Q46 73 53 89" />
    <path class="postscan-field-thread" d="M19 24 L35 20 L48 25 L62 19 L80 26 M18 47 L32 43 L46 49 L63 44 L83 50 M20 69 L34 65 L49 71 L66 65 L82 73" />
    <g class="postscan-region-layer">${marks}</g>
  </svg>`;
}

function stageMarkup(state) {
  return state.stages.filter((stage) => stage.status !== "skipped").map((stage) => {
    const stateLabel = stage.status === "complete" ? "Complete"
      : stage.status === "active" ? "Working"
        : stage.status === "stopped" ? "Stopped" : "Waiting";
    return `<li data-stage-id="${esc(stage.id)}" data-state="${esc(stage.status)}">
      <span class="postscan-stage-mark" aria-hidden="true"></span>
      <span><strong>${esc(stage.label)}</strong>${stage.detail ? `<small>${esc(stage.detail)}</small>` : ""}</span>
      <em>${stateLabel}</em>
    </li>`;
  }).join("");
}

/** Update the static reveal shell. This function has no access to capture data. */
export function renderPostScanReveal(root, state) {
  if (!root || !state) return;
  const field = root.querySelector("[data-postscan-field]");
  const stagesRoot = root.querySelector("[data-postscan-stages]");
  const message = root.querySelector("[data-postscan-message]");
  const live = root.querySelector("[data-postscan-live]");
  const action = root.querySelector("[data-postscan-actions]");
  const heading = root.querySelector("[data-postscan-heading]");
  root.dataset.state = state.status;
  root.dataset.reducedMotion = String(Boolean(state.reducedMotion));
  if (field) field.innerHTML = fieldSvg(state.visibleRegions);
  if (stagesRoot) stagesRoot.innerHTML = stageMarkup(state);
  if (message) message.textContent = state.message;
  if (live) live.textContent = state.message;
  if (heading) heading.textContent = state.status === "active" ? "Your reading is taking shape" :
    state.status === "complete" ? "Your reading is ready" : "The scan needs another look";
  if (action) action.hidden = state.status === "active" || state.status === "idle" || state.status === "complete";
}
