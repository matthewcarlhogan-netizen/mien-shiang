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
} = await import("../src/shareGate.js");

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

test("redeemPaymentParam stores paid-lifetime when ?unlocked=payment&sid= present", () => {
  clearStore();
  const changed = redeemPaymentParam("?unlocked=payment&sid=cs_test_abc123");
  assert.equal(changed, true);
  assert.equal(getUnlockState(), "paid-lifetime");
  assert.equal(isUnlocked(), true);
});

test("redeemPaymentParam does nothing when sid is missing (prevents trivial bypass)", () => {
  clearStore();
  const changed = redeemPaymentParam("?unlocked=payment");
  assert.equal(changed, false);
  assert.equal(getUnlockState(), null);
});

test("redeemPaymentParam does nothing for unrelated params", () => {
  clearStore();
  const changed = redeemPaymentParam("?foo=bar");
  assert.equal(changed, false);
  assert.equal(getUnlockState(), null);
});

test("redeemPaymentParam handles empty search string", () => {
  clearStore();
  const changed = redeemPaymentParam("");
  assert.equal(changed, false);
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
