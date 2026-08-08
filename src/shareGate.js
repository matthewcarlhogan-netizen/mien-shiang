/*
 * Share-to-unlock gate.
 *
 * After a face reading, the detailed sections (Twelve Palaces, qi-se, the
 * remaining Module A cards) are gated until the user shares a plain text
 * link with two people. This is honour-system only — optimises for reach
 * rather than abuse prevention — and requires no backend.
 *
 * ── WHAT NEVER GOES IN THE SHARE TEXT ──────────────────────────────────────
 * No numeric scores, no beauty ratings, no health claims. The share message
 * names only that the user got a face reading and invites the recipient to
 * try it. Face shape is tradition-attributed per Module A rules and may be
 * included when a reading was successfully obtained, framed as "my reading
 * placed me in …" not "I am …".
 *
 * ── UNLOCK STATES ──────────────────────────────────────────────────────────
 *   "share"         — two successful Web Share calls, or two clipboard copies.
 *   "paid-lifetime" — one-time purchase. No expiry.
 *   "subscription"  — weekly access. Expires; see SUBSCRIPTION_DAYS.
 *   null            — locked.
 *
 * ── THIS IS A SOFT GATE. IT IS BYPASSABLE, BY DESIGN AND BY NECESSITY ──────
 * Read this before pricing anything against it.
 *
 * There is no backend. Every unlock state below lives in localStorage on the
 * device, which means anyone who opens devtools can grant themselves any of
 * them in one line, and anyone who reads the source can construct the redeem
 * URL by hand. Nothing here is an entitlement; it is a courtesy latch.
 *
 * That is not a defect to be fixed in this file — it is a direct consequence
 * of the no-account, no-server, nothing-leaves-the-device design, and the only
 * real fix is a server that verifies a receipt, which would mean an account,
 * which is the thing the privacy posture exists to avoid. The honest trade is
 * to accept the leak and keep the architecture.
 *
 * What follows from that, and must not be undone by a later "hardening" pass:
 *   - Do not put anything behind this gate that would be harmful to leak.
 *   - MODULE B IS NEVER BEHIND IT. Safety content is not paid content; see
 *     MODULE_B_IS_NEVER_MONETISED in flags.js. Only Module A reading material.
 *   - Do not add obfuscation that makes the code look authoritative. A latch
 *     that pretends to be a lock invites someone downstream to trust it.
 *
 * ── LOCALITY ───────────────────────────────────────────────────────────────
 * State lives in localStorage on this device. A user who clears storage, or
 * opens on a new device, starts from zero. That is consistent with the app's
 * no-account, no-server policy — and it means a paying user can lose access by
 * clearing their browser, which the purchase copy has to say plainly.
 */

const KEY_UNLOCKED   = "mienshiang.unlock.v1";
const KEY_SHARE_COUNT = "mienshiang.shareCount.v1";
const KEY_EXPIRES_AT  = "mienshiang.unlockExpires.v1";
const SHARES_REQUIRED = 2;

/** Weekly access window. */
export const SUBSCRIPTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export const UNLOCK_SHARE = "share";
export const UNLOCK_LIFETIME = "paid-lifetime";
export const UNLOCK_SUBSCRIPTION = "subscription";

// ─────────────────────────────────────────────────────────── read / write ────

/**
 * Current unlock state, with expiry already applied.
 *
 * @param {number} now epoch ms, injected so the expiry boundary is testable
 *        without waiting a week or stubbing the clock globally. Same reasoning
 *        as the injected navigator in shareText() — the path that matters is
 *        the one that is hard to reach by accident.
 * @returns {"share"|"paid-lifetime"|"subscription"|null}
 */
export function getUnlockState(now = Date.now()) {
  try {
    const state = localStorage.getItem(KEY_UNLOCKED);
    if (!state) return null;

    // Only the subscription carries an expiry. A missing or unparseable
    // timestamp on a subscription is treated as EXPIRED, not as unlimited —
    // failing toward locked is recoverable by re-purchasing, whereas failing
    // toward open cannot be walked back once it has shipped.
    if (state === UNLOCK_SUBSCRIPTION) {
      const raw = localStorage.getItem(KEY_EXPIRES_AT);
      const expires = raw === null ? NaN : Number(raw);
      if (!Number.isFinite(expires) || now >= expires) {
        clearUnlock();
        return null;
      }
    }
    return state;
  } catch {
    return null; // private-browsing or storage disabled
  }
}

export function isUnlocked(now = Date.now()) {
  return getUnlockState(now) !== null;
}

/** Milliseconds left on a subscription, or null when not applicable. */
export function subscriptionRemainingMs(now = Date.now()) {
  try {
    if (getUnlockState(now) !== UNLOCK_SUBSCRIPTION) return null;
    const expires = Number(localStorage.getItem(KEY_EXPIRES_AT));
    return Number.isFinite(expires) ? Math.max(0, expires - now) : null;
  } catch {
    return null;
  }
}

function setUnlocked(value, expiresAt = null) {
  try {
    localStorage.setItem(KEY_UNLOCKED, value);
    if (expiresAt === null) localStorage.removeItem(KEY_EXPIRES_AT);
    else localStorage.setItem(KEY_EXPIRES_AT, String(expiresAt));
  } catch {
    // Storage unavailable — fall through; UI will re-prompt next session.
  }
}

function clearUnlock() {
  try {
    localStorage.removeItem(KEY_UNLOCKED);
    localStorage.removeItem(KEY_EXPIRES_AT);
  } catch { /* ignore */ }
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
 * Redeem a checkout success redirect. Call on page load, before any UI renders.
 *
 * Configure the Lemon Squeezy product's redirect URL to carry both params:
 *
 *   unlocked = payment | subscription    which tier was bought
 *   oid      = the order identifier      substituted by the checkout
 *
 * @param {string} search  location.search
 * @param {number} now     epoch ms, injected so expiry is testable
 * @returns {"paid-lifetime"|"subscription"|null} what was redeemed
 *
 * ── WHAT THE `oid` REQUIREMENT IS AND IS NOT WORTH ─────────────────────────
 * Requiring a second param makes the unlock URL something you cannot guess
 * from a glance at the source, which stops the most casual sharing of a magic
 * link. It is NOT verification: nothing here checks the identifier against
 * anything, because there is nothing to check it against. Someone who has
 * bought once can hand their redirect URL to anyone.
 *
 * Do not describe this as securing the gate, and do not build on it as though
 * it did. See the soft-gate note at the top of this file — the honest summary
 * is that payment is enforced by goodwill and the checkout being easier than
 * the workaround.
 */
export function redeemPaymentParam(search, now = Date.now()) {
  try {
    const p = new URLSearchParams(search);
    const kind = p.get("unlocked");
    if (!p.get("oid")) return null;

    if (kind === "payment") {
      setUnlocked(UNLOCK_LIFETIME);
      return UNLOCK_LIFETIME;
    }
    if (kind === "subscription") {
      setUnlocked(UNLOCK_SUBSCRIPTION, now + SUBSCRIPTION_DAYS * DAY_MS);
      return UNLOCK_SUBSCRIPTION;
    }
  } catch { /* malformed search string */ }
  return null;
}

/**
 * Start a weekly window directly. Exposed for the dev panel and for a caller
 * that has already established the purchase by another route.
 */
export function grantSubscription(now = Date.now()) {
  setUnlocked(UNLOCK_SUBSCRIPTION, now + SUBSCRIPTION_DAYS * DAY_MS);
  return now + SUBSCRIPTION_DAYS * DAY_MS;
}

export function grantLifetime() {
  setUnlocked(UNLOCK_LIFETIME);
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
    localStorage.removeItem(KEY_EXPIRES_AT);
  } catch { /* ignore */ }
}

/**
 * Simulate two shares without calling the OS share sheet. Dev panel only.
 */
export function simulateShares() {
  setShareCount(SHARES_REQUIRED);
  setUnlocked("share");
}
