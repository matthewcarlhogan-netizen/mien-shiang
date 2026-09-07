import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clampExposure, haloStateFromCapture, shouldUseScreenFlash, SCREEN_FLASH_DELAY_MS,
  shouldDropScreenFlash, screenFlashCapReached, SCREEN_FLASH_MAX_ON_MS,
} from "../../src/ui/qise/exposure-halo.js";

test("the passive exposure halo keeps programmatic light levels bounded", () => {
  assert.equal(clampExposure(0.7), 0.7);
  assert.equal(clampExposure(2), 1);
  assert.equal(clampExposure(-1), 0);
  assert.equal(clampExposure(Number.NaN), 0);
});

test("only validated, settled capture gates produce the perfect state", () => {
  assert.equal(haloStateFromCapture({ underexposed: true }), "adjust");
  assert.equal(haloStateFromCapture({ gatesPass: true, captureSettled: false }), "seeking");
  assert.equal(haloStateFromCapture({ gatesPass: true, captureSettled: true }), "perfect");
});

test("a persistent camera problem triggers native-style screen flash once", () => {
  assert.equal(shouldUseScreenFlash({
    issuePresent: true, issueForMs: SCREEN_FLASH_DELAY_MS - 1,
  }), false);
  assert.equal(shouldUseScreenFlash({
    issuePresent: true, issueForMs: SCREEN_FLASH_DELAY_MS,
  }), true);
  assert.equal(shouldUseScreenFlash({
    issuePresent: true, issueForMs: SCREEN_FLASH_DELAY_MS, enabled: true,
  }), false);
  assert.equal(shouldUseScreenFlash({
    issuePresent: true, issueForMs: SCREEN_FLASH_DELAY_MS, dismissed: true,
  }), false);
  assert.equal(shouldUseScreenFlash({
    issuePresent: true, issueForMs: SCREEN_FLASH_DELAY_MS, illuminationActive: true,
  }), false);
});

// ── the assist must be able to let go again ──────────────────────────────────
// Reported from a real handset: the capture sat at "1 of 4 ready" with the
// screen flash on and would not proceed. The loop armed the assist on uneven
// side light, and released it only on a FULL gate pass — but the assist
// disqualifies the hold by itself (ScreenAssistGuard.gatesPassForHold), so the
// pass it was waiting for could never happen while it was the thing blocking
// it. Uneven light is the case that closes the loop: a phone-mounted light
// travels with the phone, so it cannot make one cheek match the other.
// Measured inside the guide oval on that handset, same face seconds apart:
// assist on -> p99 face luma 253, max 255, 1.6% of skin pixels at/above the
// 250 clip point; native camera, same room, no assist -> p99 210, max 240,
// 0.0% clipped. The assist made the frame worse and then would not let go.

test("the assist releases on the darkness clearing, not on a full gate pass", () => {
  // The deadlock shape: darkness gone, but some other gate still failing.
  // Releasing must NOT wait for that other gate, or nothing can ever release.
  assert.equal(shouldDropScreenFlash({
    enabled: true, clearHeld: true, activeForMs: 1000,
  }), true, "a cleared scene must release the assist even with gates still red");

  assert.equal(shouldDropScreenFlash({
    enabled: true, clearHeld: false, activeForMs: 1000,
  }), false, "still dark, still inside the cap: keep helping acquisition");
});

test("the assist cannot stay on past its cap, whatever the gates say", () => {
  assert.equal(shouldDropScreenFlash({
    enabled: true, clearHeld: false, activeForMs: SCREEN_FLASH_MAX_ON_MS - 1,
  }), false);
  assert.equal(shouldDropScreenFlash({
    enabled: true, clearHeld: false, activeForMs: SCREEN_FLASH_MAX_ON_MS,
  }), true, "the cap is the backstop against a future gate wedging it on");
  assert.equal(screenFlashCapReached({
    enabled: true, activeForMs: SCREEN_FLASH_MAX_ON_MS,
  }), true, "a cap-forced drop is distinguishable, so the caller can stop re-arming");
  assert.equal(screenFlashCapReached({
    enabled: true, activeForMs: SCREEN_FLASH_MAX_ON_MS - 1,
  }), false);
});

test("an assist that is off, or suspended for the colour sequence, is not dropped again", () => {
  assert.equal(shouldDropScreenFlash({ enabled: false, clearHeld: true }), false);
  assert.equal(shouldDropScreenFlash({
    enabled: true, clearHeld: true, illuminationActive: true,
  }), false, "the illumination sequence owns the screen; do not fight it for control");
  assert.equal(shouldDropScreenFlash({
    enabled: true, clearHeld: false, activeForMs: SCREEN_FLASH_MAX_ON_MS * 2,
    illuminationActive: true,
  }), false, "not even the cap may seize the screen back mid-sequence");
});

test("arming and releasing cannot both be true of the same scene, so it cannot strobe", () => {
  // A scene that is dark enough to arm must not simultaneously satisfy the
  // release, or the assist oscillates at the frame rate.
  const dark = { issuePresent: true, issueForMs: SCREEN_FLASH_DELAY_MS, enabled: false };
  assert.equal(shouldUseScreenFlash(dark), true);
  assert.equal(shouldDropScreenFlash({
    enabled: true, clearHeld: false, activeForMs: SCREEN_FLASH_DELAY_MS,
  }), false);
});

// `app.js` and `beta.js` cannot be imported under node:test (item 44/18a: they
// pull MediaPipe and the DOM), so the call sites get a static guard instead —
// the same defence the consent gate uses. What is being pinned is narrow and
// exact: the screen flash arms on DARKNESS, and on nothing else.
test("neither capture loop arms the screen flash on anything but darkness", async () => {
  const { readFileSync } = await import("node:fs");
  const loops = {
    "src/ui/qise/app.js": readFileSync(new URL("../../src/ui/qise/app.js", import.meta.url), "utf8"),
    "src/beta/beta.js": readFileSync(new URL("../../src/beta/beta.js", import.meta.url), "utf8"),
  };

  for (const [name, source] of Object.entries(loops)) {
    const call = source.match(/shouldUseScreenFlash\(\{[\s\S]*?\}\)/);
    assert.ok(call, `${name} must still arm the flash through shouldUseScreenFlash`);
    const args = call[0];
    assert.match(args, /issuePresent:\s*(underexposed|isUnderexposed)\b/,
      `${name} must arm the flash on darkness alone`);
    // The two that closed the loop on a real handset. A screen light travels
    // with the phone, so it cannot correct one-sided light; and it cannot
    // focus a camera. Arming on either is what made the state unescapable.
    assert.doesNotMatch(args, /unevenLight|sidelight|\bsoft\b|filter/,
      `${name} must not arm the flash on uneven light or softness`);
  }
});

test("neither capture loop releases the screen flash on a full gate pass", async () => {
  // The release condition is the deadlock's other half. Feeding `gates.pass`
  // to the drop latch is what made the assist unable to let go: it blocks the
  // hold, so the pass it waits for cannot arrive while it is on. Both loops
  // must feed the drop latch the DARKNESS signal instead.
  const { readFileSync } = await import("node:fs");
  const loops = {
    "src/ui/qise/app.js": ["dropScreenLightLatch", "underexposed"],
    "src/beta/beta.js": ["dropAssistLatch", "isUnderexposed"],
  };

  for (const [name, [latch, darkness]] of Object.entries(loops)) {
    const source = readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");
    const update = source.match(new RegExp(`${latch}\\.update\\([^)]*\\)`));
    assert.ok(update, `${name} must still drive ${latch}`);
    assert.match(update[0], new RegExp(`!\\s*${darkness}\\b`),
      `${name} must release the assist on darkness clearing`);
    assert.doesNotMatch(update[0], /gates\.pass/,
      `${name} must not wait for a full gate pass it structurally prevents`);
    assert.match(source, /shouldDropScreenFlash\(/,
      `${name} must route the release through the shared, tested decision`);
  }
});
