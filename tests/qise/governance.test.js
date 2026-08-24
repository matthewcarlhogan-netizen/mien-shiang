import { test } from "node:test";
import assert from "node:assert/strict";
import { readTwelvePalaces } from "../../src/reading/twelve-palaces.js";
import { readThreeCourts } from "../../src/reading/three-courts.js";
import { readHarmony } from "../../src/reading/harmony.js";

test("Twelve Palaces heritage readings must not change based on pigment measurements", () => {
  const raw1 = { zones: { glabella: { deltaMi: 10 } } };
  const raw2 = { zones: { glabella: { deltaMi: -10 } } };
  const r1 = readTwelvePalaces(raw1);
  const r2 = readTwelvePalaces(raw2);
  
  for (let i = 0; i < r1.palaces.length; i++) {
    assert.equal(r1.palaces[i].reading, r2.palaces[i].reading, "Heritage reading changed!");
    assert.equal(r1.palaces[i].tone, undefined);
    assert.equal(r2.palaces[i].tone, undefined);
  }
});

test("Three Sections dominance produces neutral measurement observation and no heritage interpretation", () => {
  const geometry1 = { thirds: { upperFraction: 0.8, middleFraction: 0.1, lowerFraction: 0.1, maxDeviation: 0.5 } };
  const r1 = readThreeCourts(geometry1);

  assert.ok(r1.measurementObservation.includes("Upper Section is the largest section"));
  assert.equal(r1.heritageReading, null);
});

test("Harmony is computed without cheekbone prominence or heritage claims", () => {
  const geometry = { jaw: { degrees: 120 }, symmetry: { value: 0.5, reliable: true }, canon: [] };
  const raw = { surface: { deltaEi: 0.2 } };
  const r = readHarmony(geometry, raw);
  
  assert.equal(r.components.some(c => c.key === "cheekbones"), false);
  for (const c of r.components) {
    assert.equal(c.reads, undefined);
  }
});
