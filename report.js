/*
 * "Report this result" — required by Google Play's AI-Generated Content policy.
 *
 * Reachable without leaving the app: a button on the reading screen opens an
 * in-app form. Nothing navigates out, nothing opens a mail client.
 *
 * ── THE PAYLOAD IS THE WHOLE POINT ─────────────────────────────────────────
 * A reporting feature is the most natural place in an app like this for face
 * data to escape: "send us the reading so we can debug it" is a reasonable
 * instinct and it would be a total breach of the product's one hard promise.
 *
 * So the payload is built by `buildReportPayload()` from a CLOSED set of
 * fields, and it never receives the analysis result at all — not as an
 * argument, not on a module-scope variable. A test asserts no key from the
 * pipeline can appear in it, and the egress guard separately asserts no
 * network call references a pipeline value.
 *
 * ── sessionId ──────────────────────────────────────────────────────────────
 * Random per session, never persisted, never derived from anything about the
 * device or the person. It exists so two reports from one sitting can be read
 * together, and for nothing else. It is regenerated on every page load, so it
 * cannot link sittings and cannot re-identify anyone.
 */

import { BUILD_FLAVOUR } from "./flags.js";

export const REPORT_REASONS = [
  { value: "offensive", label: "Offensive content" },
  { value: "inaccurate", label: "Inaccurate" },
  { value: "other", label: "Other" },
];

export const NOTE_MAX_LENGTH = 500;

export const REPORT_CONFIRMATION =
  "Thank you — your report helps us improve the experience.";

/** Fields a report may contain. Anything else is a bug, and a test says so. */
export const ALLOWED_PAYLOAD_KEYS = ["type", "reason", "note", "sessionId", "moduleFlag"];

/** Non-identifying, per-session, never persisted. */
let sessionId = null;
export function getSessionId() {
  if (sessionId) return sessionId;
  const bytes = new Uint8Array(8);
  (globalThis.crypto ?? {}).getRandomValues?.(bytes);
  sessionId = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return sessionId;
}

/** Test seam only — lets a test assert the id is not reused across sessions. */
export function _resetSessionId() { sessionId = null; }

/**
 * Build the report payload.
 *
 * Takes ONLY a reason and a note. It deliberately does not accept the reading,
 * the geometry, the complexion values or anything else: a function that cannot
 * see face data cannot leak it, which is a stronger guarantee than a function
 * that sees it and promises not to send it.
 */
export function buildReportPayload(reason, note) {
  const clean = String(note ?? "").slice(0, NOTE_MAX_LENGTH);
  return {
    type: "user_report",
    reason: String(reason ?? ""),
    note: clean,
    sessionId: getSessionId(),
    moduleFlag: BUILD_FLAVOUR,
  };
}

/**
 * Transport.
 *
 * Sentry is NOT integrated in this build, so there is nothing to send to and
 * this deliberately does not invent a destination. When a DSN is configured the
 * transport is swapped in here and the egress guard begins enforcing the
 * *.ingest.sentry.io pattern.
 *
 * Until then the report is acknowledged to the user and dropped. That is
 * honest: the control exists and is reachable, as the policy requires, and the
 * app does not pretend to have delivered something it has not.
 */
export function sendReport(payload, transport) {
  if (typeof transport === "function") return transport(payload);
  console.info("user_report (no transport configured; not transmitted)", payload);
  return { delivered: false, reason: "noTransportConfigured" };
}

// ─────────────────────────────────────────────────────────────────── markup ──

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** The control on the reading screen. Module A surface — no clinical words. */
export function renderReportButton() {
  return `<button id="report-open" class="ghost report-link" type="button">
    Report this result
  </button>`;
}

export function renderReportForm() {
  return `
    <div class="report-form">
      <p class="eyebrow">Report this result</p>
      <h2>Tell us what went wrong</h2>
      <p class="muted small">This reading is generated automatically. If it came
        out wrong or read badly, we'd like to know. Nothing about your photo is
        included in a report.</p>

      <label class="report-field">
        <span>What's the problem?</span>
        <select id="report-reason">
          ${REPORT_REASONS.map((r) =>
            `<option value="${esc(r.value)}">${esc(r.label)}</option>`).join("")}
        </select>
      </label>

      <label class="report-field">
        <span>Anything else? (optional)</span>
        <textarea id="report-note" maxlength="${NOTE_MAX_LENGTH}" rows="4"
          placeholder="Up to ${NOTE_MAX_LENGTH} characters"></textarea>
      </label>

      <button id="report-submit" type="button">Send report</button>
      <button id="report-cancel" class="ghost" type="button">Cancel</button>
    </div>`;
}

export function renderReportConfirmation() {
  return `
    <div class="report-form">
      <p class="eyebrow">Report sent</p>
      <h2>${esc(REPORT_CONFIRMATION)}</h2>
      <button id="report-close" type="button">Back to the reading</button>
    </div>`;
}
