import { test } from "node:test";
import assert from "node:assert/strict";

import { SHARE_CADENCES, shareCardModel } from "../../src/ui/qise/share.js";

const reading = (i, ascendant = "ping", over = {}) => ({
  timestampIso: new Date(Date.UTC(2026, 7, i, 2, 30)).toISOString(),
  confidence: 0.9,
  compass: {
    ascendant,
    magnitude: ascendant === "ping" ? 0.2 : 1.8,
    band: ascendant === "ping" ? null : "clear",
    components: ascendant === "ping" ? {} : { [ascendant]: 1.8 },
  },
  metrics: { corrected: { ming: 1.23456789, run: 22.3456789 } },
  deviceFingerprintHash: "sha256:must-not-escape",
  gateMargins: { light: 0.12345 },
  ...over,
});

const history = (n) => Array.from({ length: n }, (_, i) =>
  reading(i + 1, ["ping", "chi", "qing"][i % 3]));

test("share cadences are the requested daily, seven-reading and fourteen-reading windows", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(SHARE_CADENCES).map(([k, v]) => [k, v.days])), {
    today: 1,
    week: 7,
    fortnight: 14,
  });
  assert.equal(shareCardModel(history(20), "today").count, 1);
  assert.equal(shareCardModel(history(20), "week").count, 7);
  assert.equal(shareCardModel(history(20), "fortnight").count, 14);
});

test("a share card is deterministic for the same scanner history", () => {
  const rows = history(14);
  assert.deepEqual(shareCardModel(rows, "fortnight"), shareCardModel(rows, "fortnight"));
});

test("the share model cannot carry a face image, raw metric, margin or device identifier", () => {
  const json = JSON.stringify(shareCardModel(history(14), "fortnight"));
  for (const forbidden of [
    "metrics", "ming", "run", "gateMargins", "deviceFingerprint", "landmark",
    "image", "photo data", "1.23456789", "must-not-escape",
  ]) {
    assert.ok(!json.includes(forbidden), `share model leaked ${forbidden}`);
  }
  assert.match(json, /no face photo shared/);
});

test("the personal wording addresses the reading, not the person's traits or future", () => {
  const model = shareCardModel([reading(9, "chi")], "today");
  assert.match(model.title, /your reading/i);
  assert.match(model.title, /chi/i);
  const copy = `${model.title} ${model.summary} ${model.footer}`;
  assert.doesNotMatch(copy, /personality|health state|diagnos|future|will happen|attractive/i);
});

test("a column summary reports frequency without interpreting a trend", () => {
  const rows = [reading(1, "chi"), reading(2, "chi"), reading(3, "ping")];
  const model = shareCardModel(rows, "week");
  assert.equal(model.summary, "Across these 3 scans, chi appears most often (2).");
  assert.doesNotMatch(model.summary, /improv|declin|trend|trajectory|health/i);
});

test("an empty or unknown share request is safe and useful", () => {
  const empty = shareCardModel(null, "week");
  assert.equal(empty.count, 0);
  assert.deepEqual(empty.seals, []);
  assert.equal(empty.summary, "No readings are recorded yet.");
  assert.equal(shareCardModel(history(3), "unknown").cadence, "today");
});

test("today's share card carries the joined structural reading without raw geometry", () => {
  const integrated = {
    fiveElements: { available: true, hanzi: "土", name: "Earth", shape: "square" },
    twelvePalaces: { measuredCount: 5, supportedCount: 6 },
  };
  const model = shareCardModel([reading(9, "chi", { integrated })], "today");
  assert.equal(model.structureLine, "Earth structure · square geometry · 5/6 supported palaces read");
  assert.doesNotMatch(JSON.stringify(model), /landmark|coordinate|embedding/i);
});
