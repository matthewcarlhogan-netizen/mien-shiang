import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clampExposure, haloStateFromCapture, shouldUseScreenFlash, SCREEN_FLASH_DELAY_MS,
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
