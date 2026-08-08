/*
 * Tests for shareGate.js
 *
 * All localStorage interactions use a minimal in-memory stub so the tests
 * run under node --test with no browser. The share/clipboard paths are
 * exercised via injected fakes rather than real browser APIs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// ── localStorage stub ──────────────────────────────────────────────────────
// shareGate.js reads/writes localStorage at module scope via globalThis, but
// since node does not have globalThis.localStorage we need to inject it
// before importing. The stub is set up before the dynamic import so that the
// module's try/catch paths see a working store.

const store = new Map();
const localStorageStub = {
  getItem: (k)   => store.has(k) ? store.get(k) : null,
  setItem: (k,v) => store.set(k, String(v)),
  removeItem: (k)=> store.delete(k),
};
globalThis.localStorage = localStorageStub;

const {
  getUnlockState,
  isUnlocked,
  getShareCount,
  redeemPaymentParam,
  buildShareText,
  shareText,
  recordShare,
  resetUnlockState,
  simulateShares,
  grantSubscription,
  grantLifetime,
  subscriptionRemainingMs,
  SUBSCRIPTION_DAYS,
} = await import("../src/shareGate.js");

const DAY = 24 * 60 * 60 * 1000;

// Helper: clear storage between tests.
function clearStore() { store.clear(); }

// ─────────────────────────────────────────── initial / reset state ─────────

test("initially locked and share count is zero", () => {
  clearStore();
  assert.equal(getUnlockState(), null);
  assert.equal(isUnlocked(), false);
  assert.equal(getShareCount(), 0);
});

test("resetUnlockState clears all keys", () => {
  clearStore();
  simulateShares();
  assert.equal(isUnlocked(), true);
  resetUnlockState();
  assert.equal(isUnlocked(), false);
  assert.equal(getShareCount(), 0);
});

// ─────────────────────────────────────────── payment URL redemption ────────

test("redeemPaymentParam stores paid-lifetime for a one-time order", () => {
  clearStore();
  const redeemed = redeemPaymentParam("?unlocked=payment&oid=ls_order_abc123");
  assert.equal(redeemed, "paid-lifetime");
  assert.equal(getUnlockState(), "paid-lifetime");
  assert.equal(isUnlocked(), true);
});

test("a one-time unlock carries no expiry and survives a year", () => {
  clearStore();
  const t0 = 1_700_000_000_000;
  redeemPaymentParam("?unlocked=payment&oid=ls_order_abc123", t0);
  assert.equal(getUnlockState(t0 + 365 * 24 * 3600 * 1000), "paid-lifetime");
});

test("redeemPaymentParam starts a dated window for a subscription order", () => {
  clearStore();
  const t0 = 1_700_000_000_000;
  const redeemed = redeemPaymentParam("?unlocked=subscription&oid=ls_order_xyz", t0);
  assert.equal(redeemed, "subscription");
  assert.equal(getUnlockState(t0), "subscription");
});

test("redeemPaymentParam does nothing without an order id (prevents trivial bypass)", () => {
  // Not security — see the soft-gate note in shareGate.js. It only stops the
  // unlock URL from being guessable at a glance.
  clearStore();
  assert.equal(redeemPaymentParam("?unlocked=payment"), null);
  assert.equal(getUnlockState(), null);
  assert.equal(redeemPaymentParam("?unlocked=subscription"), null);
  assert.equal(getUnlockState(), null);
});

test("redeemPaymentParam does nothing for unrelated params", () => {
  clearStore();
  assert.equal(redeemPaymentParam("?foo=bar"), null);
  assert.equal(getUnlockState(), null);
  assert.equal(redeemPaymentParam("?foo=bar&oid=ls_order_abc"), null);
  assert.equal(getUnlockState(), null);
});

test("redeemPaymentParam handles empty search string", () => {
  clearStore();
  assert.equal(redeemPaymentParam(""), null);
});

// ─────────────────────────────────────────── subscription expiry ──────────

test("a weekly window is open inside its term and shut after it", () => {
  clearStore();
  const t0 = 1_700_000_000_000;
  grantSubscription(t0);

  assert.equal(getUnlockState(t0), "subscription");
  assert.equal(getUnlockState(t0 + 6 * DAY), "subscription", "day six is inside");

  // The boundary itself is CLOSED. A window described as seven days must not
  // be seven days and a bit, and an off-by-one here is invisible unless the
  // exact instant is asserted.
  const expiry = t0 + SUBSCRIPTION_DAYS * DAY;
  assert.equal(getUnlockState(expiry - 1), "subscription");
  assert.equal(getUnlockState(expiry), null, "the expiry instant is expired");
  assert.equal(getUnlockState(expiry + DAY), null);
});

test("expiry clears the stored state rather than leaving it to be re-read", () => {
  clearStore();
  const t0 = 1_700_000_000_000;
  grantSubscription(t0);
  assert.equal(getUnlockState(t0 + 8 * DAY), null);
  // Reading at a time BEFORE the expiry must not resurrect it: the lapse is
  // recorded, not recomputed from a clock the user controls.
  assert.equal(getUnlockState(t0), null, "a lapsed window must stay lapsed");
});

test("a subscription with a missing or corrupt expiry fails CLOSED", () => {
  // Failing toward locked is recoverable by re-purchasing. Failing toward open
  // cannot be walked back once it has shipped.
  clearStore();
  store.set("mienshiang.unlock.v1", "subscription");
  assert.equal(getUnlockState(), null, "no timestamp at all");

  clearStore();
  store.set("mienshiang.unlock.v1", "subscription");
  store.set("mienshiang.unlockExpires.v1", "not-a-number");
  assert.equal(getUnlockState(), null, "unparseable timestamp");
});

test("remaining time is reported only for a live subscription", () => {
  clearStore();
  const t0 = 1_700_000_000_000;
  assert.equal(subscriptionRemainingMs(t0), null, "nothing bought");

  grantLifetime();
  assert.equal(subscriptionRemainingMs(t0), null, "lifetime does not expire");

  clearStore();
  grantSubscription(t0);
  assert.equal(subscriptionRemainingMs(t0 + 2 * DAY), 5 * DAY);
  assert.equal(subscriptionRemainingMs(t0 + 99 * DAY), null, "expired reports nothing");
});

test("resetting clears the expiry too, not just the state", () => {
  clearStore();
  const t0 = 1_700_000_000_000;
  grantSubscription(t0);
  resetUnlockState();
  assert.equal(getUnlockState(t0), null);
  assert.equal(store.get("mienshiang.unlockExpires.v1"), undefined,
    "a stale expiry left behind would apply to the next purchase");
});

// ─────────────────────────────────────────────── share text ───────────────

test("buildShareText includes tradition framing and URL", () => {
  const text = buildShareText("Wood", "https://example.com");
  assert.ok(text.includes("Mien Shiang"), "names the tradition");
  assert.match(text, /https:\/\/example\.com/, "includes URL");
  assert.ok(!text.includes("score"), "no score claim");
  assert.ok(!text.includes("/100"), "no numeric score");
  // Must not assert a trait about the person
  assert.ok(!text.match(/\bI am\b/i), "no assertive 'I am'");
  assert.ok(text.includes("tradition"), "explicitly tradition-framed");
});

test("buildShareText without face shape omits the shape clause", () => {
  const text = buildShareText(null, "https://example.com");
  assert.ok(!text.includes("tradition."), "no shape clause when null");
  assert.match(text, /https:\/\/example\.com/);
});

test("buildShareText: face shape is framed as placement not trait", () => {
  const text = buildShareText("Fire", "https://example.com");
  assert.ok(text.includes("placed me in the Fire tradition"),
    "framed as placement: " + text);
});

// ─────────────────────────────────────────── shareText dispatch ───────────

test("shareText returns 'shared' when navigator.share resolves", async () => {
  const fakeNav = { share: async () => {} };
  const result = await shareText("hello", fakeNav, null);
  assert.equal(result, "shared");
});

test("shareText returns 'cancelled' on AbortError", async () => {
  const err = new Error("user cancelled");
  err.name = "AbortError";
  const fakeNav = { share: async () => { throw err; } };
  const result = await shareText("hello", fakeNav, null);
  assert.equal(result, "cancelled");
});

test("shareText falls back to clipboard when share API unavailable", async () => {
  let written = null;
  const fakeClip = { writeText: async (t) => { written = t; } };
  const result = await shareText("hello", {}, fakeClip);
  assert.equal(result, "copied");
  assert.equal(written, "hello");
});

test("shareText falls back to clipboard when share throws non-AbortError", async () => {
  let written = null;
  const fakeNav = { share: async () => { throw new Error("not supported"); } };
  const fakeClip = { writeText: async (t) => { written = t; } };
  const result = await shareText("hello", fakeNav, fakeClip);
  assert.equal(result, "copied");
  assert.equal(written, "hello");
});

test("shareText returns 'failed' when both APIs unavailable", async () => {
  const result = await shareText("hello", {}, null);
  assert.equal(result, "failed");
});

// ──────────────────────────────────────────── recordShare + unlock ─────────

test("one recordShare increments count but does not unlock", () => {
  clearStore();
  const { count, unlocked } = recordShare();
  assert.equal(count, 1);
  assert.equal(unlocked, false);
  assert.equal(isUnlocked(), false);
});

test("two recordShare calls unlock via share", () => {
  clearStore();
  recordShare();
  const { count, unlocked } = recordShare();
  assert.equal(count, 2);
  assert.equal(unlocked, true);
  assert.equal(getUnlockState(), "share");
  assert.equal(isUnlocked(), true);
});

test("recordShare count persists across calls", () => {
  clearStore();
  recordShare();
  assert.equal(getShareCount(), 1);
  recordShare();
  assert.equal(getShareCount(), 2);
});

// ─────────────────────────────────────────── simulateShares dev tool ──────

test("simulateShares sets share-unlock state immediately", () => {
  clearStore();
  simulateShares();
  assert.equal(isUnlocked(), true);
  assert.equal(getShareCount(), 2);
});
