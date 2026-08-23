import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  integratedReadingFromScalars, projectIntegratedReading, measureIntegratedReading,
  assertCompletePalaceStructure,
} from "../../src/qise/integrated.js";
import { extractRegions } from "../../src/region-extractor.js";
import { canonicalFace } from "../fixtures/canonical-face.js";
import { findForbiddenKeys, toRecord } from "../../src/qise/store.js";
import { integratedReadingModel } from "../../src/ui/qise/screens.js";
import { LM } from "../../src/geometry.js";

function face() {
  const cx = 200, length = 115, cheek = 100, jaw = 95, forehead = 90;
  const points = Array.from({ length: 478 }, () => ({ x: cx, y: length / 2 }));
  const at = (index, x, y) => { points[index] = { x, y }; };
  at(LM.OVAL_APEX, cx, 0); at(LM.MENTON, cx, length);
  at(LM.GLABELLA, cx, 34.5); at(LM.SUBNASALE, cx, 71.3);
  at(LM.LABIALE_SUPERIUS, cx, 82.8);
  at(LM.ZYGION_A, cx - cheek / 2, 51.75); at(LM.ZYGION_B, cx + cheek / 2, 51.75);
  at(LM.GONION_A, cx - jaw / 2, 86.25); at(LM.GONION_B, cx + jaw / 2, 86.25);
  at(LM.FRONTOTEMPORAL_A, cx - forehead / 2, 17.25);
  at(LM.FRONTOTEMPORAL_B, cx + forehead / 2, 17.25);
  at(33, 160, 48); at(263, 240, 48); at(133, 186, 48); at(362, 214, 48);
  at(LM.UPPER_LID_A, 173, 46); at(LM.UPPER_LID_B, 227, 46);
  return points;
}

function raw() {
  const keys = [
    "glabella", "center_forehead", "nose_bridge", "nose_apex",
    "eyebrow_right", "eyebrow_left", "upper_eyelid_right", "upper_eyelid_left",
    "outer_eye_right", "outer_eye_left", "temple_right", "temple_left",
    "fortune_forehead_right", "fortune_forehead_left",
    "parent_forehead_right", "parent_forehead_left",
    "periorbital_left", "periorbital_right", "cheek_left", "cheek_right", "chin",
  ];
  return {
    baseline: { regime: "full", band: "light", n: 9000 },
    zones: Object.fromEntries(keys.map((key, index) => [key, {
      deltaEi: 0, deltaMi: index % 3 === 0 ? -2 : 0,
      deltaContrast: 0, ridge: 0.01, ridgeDelta: 0, ridgeAxis: "horizontal",
      L: 60, b: 15, pixels: 4000,
    }])),
  };
}

const colourReading = (integrated) => ({
  timestampIso: "2026-08-11T03:00:00.000Z",
  compass: { ascendant: "chi", magnitude: 2, band: "clear", components: { chi: 2 } },
  composition: {
    basis: "capture", lead: "chi", support: "huang",
    segments: { chi: 40, huang: 25, qing: 15, bai: 12, hei: 8 },
  },
  integrated,
});

test("the accepted map becomes a complete, privacy-safe integrated reading", () => {
  const reading = integratedReadingFromScalars(face(), raw());
  assert.equal(reading.fiveElements.available, true);
  assert.equal(reading.fiveElements.element, "earth");
  assert.equal(reading.threeCourts.available, true);
  assert.equal(reading.twelvePalaces.measuredCount, 12);
  assert.ok(reading.harmony.components.length >= 3);
  assert.ok(Object.keys(reading.provenanceIds).length > 0);
  assert.deepEqual(findForbiddenKeys(reading), []);
  assert.doesNotMatch(JSON.stringify(reading), /\"[xyz]\"\s*:/);
});

test("the integrated projection rejects fields attached outside its allow-list", () => {
  const clean = integratedReadingFromScalars(face(), raw());
  const projected = projectIntegratedReading({
    ...clean,
    landmarks: face(),
    fiveElements: { ...clean.fiveElements, sourceImage: "data:image/jpeg;base64,no" },
  });
  assert.deepEqual(findForbiddenKeys(projected), []);
  assert.equal(projected.landmarks, undefined);
  assert.equal(projected.fiveElements.sourceImage, undefined);
});

test("storage preserves the joined reading and still contains no biometric template", () => {
  const integrated = integratedReadingFromScalars(face(), raw());
  const stored = toRecord(colourReading(integrated));
  assert.deepEqual(stored.integrated, integrated);
  assert.deepEqual(findForbiddenKeys(stored), []);
});

test("the screen model makes one synthesis from colour, geometry and palaces", () => {
  const model = integratedReadingModel(colourReading(integratedReadingFromScalars(face(), raw())));
  assert.equal(model.available, true);
  assert.match(model.headline, /赤 today, over 土 Earth/);
  assert.match(model.synthesis, /changing colour layer/i);
  assert.equal(model.palaces.measuredCount, 12);
  assert.equal(model.palaces.supportedCount, 12);
  assert.equal(model.palaces.all.length, 12);
  assert.equal(model.palaces.all.filter((palace) => !palace.measured).length, 0);
  assert.ok(model.harmony.label.includes("named canons"));
});

test("the accepted-frame boundary refuses structurally incomplete twelve-palace results", () => {
  const incompleteReading = { palaces: [{ key: "life" }] };
  assert.throws(
    () => assertCompletePalaceStructure(incompleteReading),
    (error) => error.code === "INCOMPLETE_PALACE_STRUCTURE",
  );
});

test("structural validation fails when a palace is missing", () => {
  const reading = integratedReadingFromScalars(face(), raw());
  reading.twelvePalaces.palaces = reading.twelvePalaces.palaces.slice(0, 11);
  assert.throws(() => assertCompletePalaceStructure(reading.twelvePalaces), /Palace count mismatch/);
});

test("structural validation fails when a palace is duplicated", () => {
  const reading = integratedReadingFromScalars(face(), raw());
  reading.twelvePalaces.palaces[0] = reading.twelvePalaces.palaces[1];
  assert.throws(() => assertCompletePalaceStructure(reading.twelvePalaces), /duplicate/);
});

test("structural validation fails when metadata is missing", () => {
  const reading = integratedReadingFromScalars(face(), raw());
  delete reading.twelvePalaces.palaces[0].location;
  assert.throws(() => assertCompletePalaceStructure(reading.twelvePalaces), /Life Palace/);
});

test("a missing capture region is allowed and results in an unmeasured palace", () => {
  const incompleteRaw = raw();
  delete incompleteRaw.zones.temple_left;
  const reading = integratedReadingFromScalars(face(), incompleteRaw);
  const travel = reading.twelvePalaces.palaces.find((p) => p.key === "travel");
  assert.equal(travel.measured, false);
  assert.match(travel.notMeasuredNote, /Region not available in this photo/i);
});

test("the accepted frame reaches integration before capture teardown erases it", () => {
  const source = readFileSync(new URL("../../src/ui/qise/app.js", import.meta.url), "utf8");
  const start = source.indexOf("if (collecting === 0)");
  const end = source.indexOf("return;", start);
  const completion = source.slice(start, end);
  assert.ok(start >= 0 && end > start, "capture completion branch not found");
  assert.doesNotMatch(completion, /clearFrame\s*\(/,
    "the accepted frame was erased before its structural reading ran");
  assert.match(completion, /lastCaptureTier, image, pts/,
    "the accepted frame and map do not reach the integration boundary");
});

test("a failed integrated extraction still erases its balanced frame", () => {
  const balanced = new Uint8ClampedArray([7, 8, 9, 255]);
  assert.throws(() => measureIntegratedReading(
    { data: new Uint8ClampedArray(4), width: 1, height: 1 },
    face(), null,
    {
      shadesOfGray: () => balanced,
      extractRegions: () => { throw new Error("synthetic extraction failure"); },
    },
  ), /synthetic extraction failure/);
  assert.deepEqual([...balanced], [0, 0, 0, 0]);
});

test("a failed region statistic erases the temporary pixels and mask", () => {
  let capturedPixels = null;
  let capturedMask = null;
  const documentRef = {
    createElement: () => {
      const canvas = { width: 0, height: 0 };
      canvas.getContext = () => ({
        beginPath() {}, lineTo() {}, moveTo() {}, closePath() {}, fill() {},
        getImageData: () => ({
          data: new Uint8ClampedArray(canvas.width * canvas.height * 4).fill(255),
        }),
        set fillStyle(_value) {},
      });
      return canvas;
    },
  };
  assert.throws(() => extractRegions(
    new Uint8ClampedArray(768 * 1024 * 4).fill(120),
    768, 1024, canonicalFace(), documentRef,
    { regionStats: (pixels, mask) => {
      capturedPixels = pixels;
      capturedMask = mask;
      throw new Error("synthetic statistics failure");
    } },
  ), /synthetic statistics failure/);
  assert.ok(capturedPixels && capturedMask, "the failure path was not exercised");
  assert.equal(capturedPixels.every((value) => value === 0), true);
  assert.equal(capturedMask.every((value) => value === 0), true);
});
