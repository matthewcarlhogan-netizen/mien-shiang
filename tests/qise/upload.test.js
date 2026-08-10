import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_SELFIE_BYTES, fitSelfieDimensions, validateSelfieDimensions, validateSelfieFile,
} from "../../src/qise/upload.js";

test("the selfie gate accepts local images and rejects non-images", () => {
  assert.equal(validateSelfieFile({ type: "image/jpeg", size: 2_000_000 }).ok, true);
  assert.equal(validateSelfieFile({ type: "image/heic", size: 2_000_000 }).ok, true);
  assert.equal(validateSelfieFile({ type: "application/pdf", size: 20_000 }).ok, false);
  assert.equal(validateSelfieFile(null).ok, false);
});

test("oversized and empty selfies are refused before decoding", () => {
  assert.equal(validateSelfieFile({ type: "image/png", size: 0 }).ok, false);
  const result = validateSelfieFile({ type: "image/png", size: MAX_SELFIE_BYTES + 1 });
  assert.equal(result.ok, false);
  assert.match(result.message, /15 MB/);
});

test("large selfies are bounded without changing their aspect ratio", () => {
  assert.deepEqual(fitSelfieDimensions(4032, 3024), {
    width: 2048, height: 1536, originalWidth: 4032, originalHeight: 3024,
    scale: 2048 / 4032,
  });
  assert.deepEqual(fitSelfieDimensions(800, 600), {
    width: 800, height: 600, originalWidth: 800, originalHeight: 600, scale: 1,
  });
});

test("tiny or undecodable selfies get an actionable retry message", () => {
  assert.equal(validateSelfieDimensions(1200, 900).ok, true);
  assert.equal(validateSelfieDimensions(479, 900).ok, false);
  assert.equal(validateSelfieDimensions(0, 0).ok, false);
});
