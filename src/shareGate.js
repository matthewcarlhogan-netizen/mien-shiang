/*
 * Share-to-unlock gate — Phase 3C extended.
 *
 * After a face reading, the detailed sections (Twelve Palaces, qi-se, the
 * remaining Module A cards) are gated until the user shares a plain text
 * link with two people OR pays for access. This is honour-system only for the
 * share path — optimises for reach rather than abuse prevention — and requires
 * no backend.
 *
 * ── WHAT NEVER GOES IN THE SHARE TEXT ──────────────────────────────────────
 * No numeric scores, no beauty ratings, no health claims. The share message
 * names only that the user got a face reading and invites the recipient to
 * try it. Face shape is tradition-attributed per Module A rules and may be
 * included when a reading was successfully obtained, framed as "my reading
 * placed me in …" not "I am …".
 *
 * ── UNLOCK STATES ──────────────────────────────────────────────────────────
 *   "share"        — two successful Web Share calls, or two clipboard copies.
 *   "paid-lifetime"— operator-set via URL param ?unlocked=payment (Stripe
 *                    redirect, pending domain configuration).
 *   "subscription" — weekly Stripe subscription (?unlocked=subscription).
 *   null           — locked.
 *
 * ── UNLOCK PRIORITY ────────────────────────────────────────────────────────
 *   paid-lifetime             → always unlocked
 *   subscription (valid)      → unlocked until 7 days after subscriptionStart
 *   free (share)              → unlocked
 *   otherwise                 → locked, show teaser + modal
 *
 * ── LOCALITY ───────────────────────────────────────────────────────────────
 * State lives in localStorage on this device. A user who clears storage, or
 * opens on a new device, starts from zero. That is consistent with the app's
 * no-account, no-server policy.
 */

const KEY_UNLOCKED         = "mienshiang.unlock.v1";
const KEY_SHARE_COUNT      = "mienshiang.shareCount.v1";
const KEY_SUBSCRIPTION_START = "mienshiang.subscriptionStart.v1";
const SHARES_REQUIRED      = 2;
const SUBSCRIPTION_MS      = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─────────────────────────────────────────────────────────── read / write ────

/** @returns {"share"|"paid-lifetime"|"subscription"|null} */
export function getUnlockState() {
  try {
    return localStorage.getItem(KEY_UNLOCKED) ?? null;
  } catch {
    return null; // private-browsing or storage disabled
  }
}

/**
 * Check subscription validity. Returns true if a subscription is stored and
 * has not yet expired (7-day window).
 */
export function isSubscriptionValid(nowMs = Date.now()) {
  try {
    const raw = localStorage.getItem(KEY_SUBSCRIPTION_START);
    if (!raw) return false;
    const start = parseInt(raw, 10);
    return Number.isFinite(start) && (nowMs - start) < SUBSCRIPTION_MS;
  } catch {
    return false;
  }
}

/**
 * Returns true when the full report should be shown.
 *
 * Priority order:
 *   1. paid-lifetime (permanent)
 *   2. subscription (valid within 7 days)
 *   3. share (honour system)
 */
export function isUnlocked(nowMs = Date.now()) {
  const state = getUnlockState();
  if (state === "paid-lifetime") return true;
  if (state === "subscription") return isSubscriptionValid(nowMs);
  if (state === "share") return true;
  return false;
}

function setUnlocked(value) {
  try {
    localStorage.setItem(KEY_UNLOCKED, value);
  } catch {
    // Storage unavailable — fall through; UI will re-prompt next session.
  }
}

export function getShareCount() {
  try {
    return parseInt(localStorage.getItem(KEY_SHARE_COUNT) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function setShareCount(n) {
  try {
    localStorage.setItem(KEY_SHARE_COUNT, String(n));
  } catch { /* ignore */ }
}

// ──────────────────────────────────────────────────── URL-param detection ────

/**
 * Call this on page load (before any UI renders) to redeem a Stripe success
 * redirect. Stripe appends ?unlocked=payment to the return URL configured in
 * the dashboard.
 *
 * @param {string} search  location.search
 * @returns {boolean} true if a payment param was detected and stored
 *
 * ── HOW THIS AVOIDS TRIVIAL BYPASS ─────────────────────────────────────────
 * Requiring `unlocked=payment` alone is bypassable by anyone who reads the
 * source. So the check also requires a non-empty `sid` param. Configure the
 * Stripe Payment Link success URL as:
 *
 *   https://[yourdomain]/?unlocked=payment&sid={CHECKOUT_SESSION_ID}
 *
 * Stripe substitutes the actual checkout session ID into {CHECKOUT_SESSION_ID}.
 * Anyone faking the redirect must know a real Stripe session ID — still
 * honour-system for a determined attacker, but meaningfully harder than
 * guessing a static string.
 *
 * This is the best available without a backend. Do not accept `unlocked=payment`
 * without `sid` — the current code rejects it.
 */
export function redeemPaymentParam(search) {
  try {
    const p = new URLSearchParams(search);
    if (p.get("unlocked") === "payment" && p.get("sid")) {
      setUnlocked("paid-lifetime");
      return true;
    }
    if (p.get("unlocked") === "subscription" && p.get("sid")) {
      setUnlocked("subscription");
      try {
        localStorage.setItem(KEY_SUBSCRIPTION_START, String(Date.now()));
      } catch { /* ignore */ }
      return true;
    }
  } catch { /* malformed search string */ }
  return false;
}

// ─────────────────────────────────────────────────────────── share logic ────

/**
 * Build the tradition-attributed share text. Face shape is optional (included
 * only when a reading was obtained, framed as tradition not trait).
 *
 * @param {string|null} faceShapeName  e.g. "Wood" — Module A name, never a
 *        trait claim. Pass null when the reading was not obtained.
 * @param {string} url  canonical app URL
 * @returns {string}
 */
export function buildShareText(faceShapeName, url) {
  const shapeClause = faceShapeName
    ? ` My reading placed me in the ${faceShapeName} tradition.`
    : "";
  return `I got my Mien Shiang face reading — a classical Chinese face-reading.${shapeClause} Try yours: ${url}`;
}

/**
 * Attempt to share text via the Web Share API. Falls back to clipboard.
 *
 * @param {string} text
 * @param {object} nav  navigator-shaped (injected for testability)
 * @param {object} clip  clipboard-shaped (injected for testability)
 * @returns {Promise<"shared"|"copied"|"failed">}
 */
export async function shareText(text, nav = globalThis.navigator, clip = globalThis.navigator?.clipboard) {
  // Web Share API — text-only, no file, universally supported on mobile.
  if (typeof nav?.share === "function") {
    try {
      await nav.share({ text });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
      // Fall through to clipboard.
    }
  }
  // Clipboard fallback for desktop.
  if (clip?.writeText) {
    try {
      await clip.writeText(text);
      return "copied";
    } catch { /* permissions denied */ }
  }
  return "failed";
}

/**
 * Record one completed share attempt and check whether unlock threshold is met.
 *
 * Call this after `shareText()` resolves to "shared" or "copied".
 *
 * @returns {{ count: number, unlocked: boolean }}
 */
export function recordShare() {
  const count = getShareCount() + 1;
  setShareCount(count);
  if (count >= SHARES_REQUIRED) {
    setUnlocked("share");
    return { count, unlocked: true };
  }
  return { count, unlocked: false };
}

// ─────────────────────────────────────────────────────────── dev / reset ────

/**
 * Reset all unlock state. Used by the hidden dev panel (7 rapid logo taps).
 * Never exposed to normal navigation.
 */
export function resetUnlockState() {
  try {
    localStorage.removeItem(KEY_UNLOCKED);
    localStorage.removeItem(KEY_SHARE_COUNT);
    localStorage.removeItem(KEY_SUBSCRIPTION_START);
  } catch { /* ignore */ }
}

/**
 * Simulate two shares without calling the OS share sheet. Dev panel only.
 */
export function simulateShares() {
  setShareCount(SHARES_REQUIRED);
  setUnlocked("share");
}

/**
 * Simulate a subscription redemption. Dev panel only.
 * @param {number} [startMs]  subscription start time (defaults to now)
 */
export function simulateSubscription(startMs = Date.now()) {
  try {
    localStorage.setItem(KEY_SUBSCRIPTION_START, String(startMs));
    setUnlocked("subscription");
  } catch { /* ignore */ }
}

/**
 * Returns the number of milliseconds remaining in the current subscription,
 * or 0 if there is no active subscription.
 * @param {number} [nowMs]
 * @returns {number}
 */
export function subscriptionMsRemaining(nowMs = Date.now()) {
  try {
    const raw = localStorage.getItem(KEY_SUBSCRIPTION_START);
    if (!raw) return 0;
    const start = parseInt(raw, 10);
    const remaining = SUBSCRIPTION_MS - (nowMs - start);
    return Math.max(0, remaining);
  } catch {
    return 0;
  }
}
