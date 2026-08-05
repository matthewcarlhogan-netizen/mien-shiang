/*
 * GPU→CPU fallback tests.
 *
 * The requirement is a CPU fallback that is ACTUALLY TESTED, not assumed. A
 * fallback path is the classic piece of code that is written once, never
 * executed, and quietly broken by a later refactor — so these tests drive the
 * GPU factory to throw and assert the CPU path is genuinely reached.
 *
 * The MediaPipe factory is injected rather than imported, which is why this is
 * testable at all: src/analysis.js imports the bundle from a CDN at module
 * scope and cannot be loaded under node --test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createLandmarkerWithFallback, DELEGATE_ORDER } from "../src/landmarker.js";

const MODEL = { modelAssetPath: "face_landmarker.task" };

/** Records every call, and fails on whichever delegates are named. */
function fakeFactory(failOn = []) {
  const calls = [];
  const fn = async (fileset, opts) => {
    calls.push(opts);
    const d = opts.baseOptions.delegate;
    if (failOn.includes(d)) throw new Error(`${d} unavailable in this context`);
    return { __landmarker: true, delegate: d };
  };
  fn.calls = calls;
  return fn;
}

test("GPU is tried first and used when it works", async () => {
  const factory = fakeFactory();
  const r = await createLandmarkerWithFallback(factory, {}, MODEL);

  assert.equal(r.delegate, "GPU");
  assert.equal(factory.calls.length, 1, "CPU must not be constructed when GPU succeeds");
  assert.equal(factory.calls[0].baseOptions.delegate, "GPU");
  assert.deepEqual(r.attempts, [{ delegate: "GPU", ok: true }]);
});

test("GPU failure falls back to CPU and the CPU path really runs", async () => {
  const factory = fakeFactory(["GPU"]);
  const r = await createLandmarkerWithFallback(factory, {}, MODEL);

  assert.equal(r.delegate, "CPU");
  assert.equal(r.landmarker.delegate, "CPU", "returned landmarker must be the CPU one");
  assert.deepEqual(factory.calls.map((c) => c.baseOptions.delegate), ["GPU", "CPU"]);

  // The GPU failure is recorded, not swallowed.
  assert.equal(r.attempts[0].ok, false);
  assert.match(r.attempts[0].error, /GPU unavailable/);
  assert.equal(r.attempts[1].ok, true);
});

test("when every delegate fails, BOTH errors are surfaced", async () => {
  const factory = fakeFactory(["GPU", "CPU"]);

  await assert.rejects(
    () => createLandmarkerWithFallback(factory, {}, MODEL),
    (err) => {
      // Reporting only the last failure hides the GPU error, which is usually
      // the informative one.
      assert.match(err.message, /GPU: GPU unavailable/);
      assert.match(err.message, /CPU: CPU unavailable/);
      return true;
    },
  );
  assert.equal(factory.calls.length, 2, "both delegates must have been attempted");
});

test("both delegates are configured identically apart from the delegate itself", async () => {
  const factory = fakeFactory(["GPU"]);
  await createLandmarkerWithFallback(factory, {}, MODEL);

  const [gpu, cpu] = factory.calls;
  for (const opts of [gpu, cpu]) {
    // A single still, never LIVE_STREAM — the continuous path is the known
    // failure mode on iOS Safari (see CLAUDE.md / the product constraints).
    assert.equal(opts.runningMode, "IMAGE");
    assert.equal(opts.numFaces, 1);
    assert.equal(opts.outputFaceBlendshapes, true);
    assert.equal(opts.baseOptions.modelAssetPath, MODEL.modelAssetPath);
  }
  assert.notEqual(gpu.baseOptions.delegate, cpu.baseOptions.delegate);
});

test("progress is reported for the fallback so a slow CPU run is explained", async () => {
  const seen = [];
  await createLandmarkerWithFallback(fakeFactory(["GPU"]), {}, MODEL, (m) => seen.push(m));
  assert.ok(seen.some((m) => /slower/i.test(m)),
    "the user must be told why this run is slow, not left with a frozen button");
});

test("delegate order is GPU then CPU", () => {
  assert.deepEqual(DELEGATE_ORDER, ["GPU", "CPU"]);
});
