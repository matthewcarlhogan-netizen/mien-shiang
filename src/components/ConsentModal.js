/*
 * Consent Modal — Phase 3B.
 *
 * This module manages the mandatory consent gate that must be shown before any
 * camera access (getUserMedia) is requested.
 *
 * ── CONTRACT ───────────────────────────────────────────────────────────────
 * - If localStorage key 'consentGiven' !== 'true', the modal is shown and no
 *   camera access is permitted.
 * - "I Agree — Start Scan" sets the key and calls the provided onAgree callback.
 * - "No Thanks — Exit" redirects to index.html.
 * - The modal is dismissible only via its own buttons — Esc is suppressed.
 *
 * ── DESIGN RATIONALE ───────────────────────────────────────────────────────
 * Consent is collected at launch rather than at scan time so that the user
 * has read the privacy terms before any media device is enumerated. This is
 * consistent with APP 3.3 (Australian Privacy Act) which requires notification
 * before, or at the time of, collection.
 *
 * ── PURE DOM FACTORY, NO GLOBAL SIDE EFFECTS ───────────────────────────────
 * The module exports a factory and a check function. It does not attach
 * anything to the DOM at import time, making it fully testable under
 * node --test with an injected document stub.
 */

export const CONSENT_KEY = "consentGiven";

/**
 * Check whether consent has already been given.
 *
 * @param {Storage} [storage]  defaults to globalThis.localStorage
 * @returns {boolean}
 */
export function hasConsent(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Persist consent.
 *
 * @param {Storage} [storage]
 */
export function recordConsent(storage = globalThis.localStorage) {
  try {
    storage?.setItem(CONSENT_KEY, "true");
  } catch { /* storage unavailable */ }
}

/**
 * Revoke consent (for testing or erasure requests).
 *
 * @param {Storage} [storage]
 */
export function revokeConsent(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(CONSENT_KEY);
  } catch { /* storage unavailable */ }
}

/**
 * Build and attach the consent modal to the given container element.
 *
 * Returns a promise that resolves when the user agrees. If the user declines,
 * the page is redirected and the promise never resolves (the caller should
 * await it only after calling this function, since a decline redirects away).
 *
 * @param {{
 *   container: Element,         // where to attach the modal DOM
 *   storage?: Storage,          // defaults to globalThis.localStorage
 *   nav?: { location: Location } // defaults to globalThis
 *   onAgree?: () => void,       // called synchronously after consent is stored
 * }} options
 * @returns {Promise<void>}  resolves when the user has agreed
 */
export function showConsentModal({ container, storage, nav, onAgree } = {}) {
  const store = storage ?? globalThis.localStorage;
  const location = nav?.location ?? globalThis.location;

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "consent-title");
    overlay.className = "consent-overlay";

    overlay.innerHTML = `
      <div class="consent-card">
        <h2 id="consent-title">Before We Begin</h2>
        <p>
          This app processes your facial geometry locally on your device.
          No images are uploaded to any server.
          No biometric data is stored. Only your face shape (e.g. 'Moon') is saved locally.
          Results are for entertainment and self-reflection only, based on Traditional
          Chinese Medicine tradition and geometric ratios — not clinical science.
          You may withdraw consent at any time by clearing your browser data.
        </p>
        <p>
          <a href="/privacy.html">View Privacy Policy</a>
        </p>
        <div class="consent-actions">
          <button id="consent-agree" class="consent-btn consent-btn--primary">
            I Agree — Start Scan
          </button>
          <button id="consent-decline" class="consent-btn consent-btn--secondary">
            No Thanks — Exit
          </button>
        </div>
      </div>
    `;

    // Suppress Esc so the modal cannot be dismissed without an explicit choice.
    const trapEsc = (e) => { if (e.key === "Escape") e.preventDefault(); };
    document.addEventListener("keydown", trapEsc);

    overlay.querySelector("#consent-agree").addEventListener("click", () => {
      recordConsent(store);
      document.removeEventListener("keydown", trapEsc);
      overlay.remove();
      onAgree?.();
      resolve();
    });

    overlay.querySelector("#consent-decline").addEventListener("click", () => {
      document.removeEventListener("keydown", trapEsc);
      // Redirect without storing consent.
      location.href = "/index.html";
    });

    container.appendChild(overlay);

    // Focus the primary button so keyboard users can proceed immediately.
    overlay.querySelector("#consent-agree").focus();
  });
}

/**
 * Ensure consent exists, showing the modal if not.
 *
 * Convenience wrapper for the common initialisation pattern:
 *
 *   await ensureConsent({ container: document.body, onAgree: startScan });
 *
 * If consent is already stored, onAgree is called synchronously and this
 * returns a resolved promise immediately (no modal shown).
 *
 * @param {Parameters<typeof showConsentModal>[0]} options
 * @returns {Promise<void>}
 */
export function ensureConsent(options = {}) {
  const store = options.storage ?? globalThis.localStorage;
  if (hasConsent(store)) {
    options.onAgree?.();
    return Promise.resolve();
  }
  return showConsentModal(options);
}
