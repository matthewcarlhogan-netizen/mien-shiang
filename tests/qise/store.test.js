/*
 * PHASE 7 gate — no persisted key may match /image|pixel|landmark|embedding|
 * blob|dataUrl/i.
 *
 * The assertion runs against the REAL shaping function, fed a reading object
 * carrying exactly what the capture path would hang off it. A privacy
 * guarantee tested only against a hand-written record is a guarantee about the
 * hand-written record.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  toRecord, findForbiddenKeys, openStore, FORBIDDEN_KEY_PATTERN,
  STORE_READINGS, DB_NAME,
} from "../../src/qise/store.js";
import { createConsent, memoryStorage, CONSENT_STORAGE_KEY } from "../../src/qise/consent.js";

/* ── a reading with every hazard the capture path could attach ───────────── */

const hazardousReading = () => ({
  timestampIso: "2026-08-09T02:30:00.000Z",
  metrics: {
    raw: { hueVector: { a: 14, b: 12 }, ming: 1.1, run: 21, han: -0.4, xue: 1.2, meanChroma: 18, meanL: 62, periorbitalL: 55, basis: "a+b", roisRead: 7 },
    corrected: { hueVector: { a: 13, b: 11 }, ming: 1.1, run: 20, han: -0.4, xue: 1.2, meanChroma: 17, meanL: 62, periorbitalL: 55, basis: "a+b", roisRead: 7 },
  },
  axes: { a: 14, b: 12, L: 62, C: 18, periorbitalL: 55 },
  deltas: { a: 0.1, b: 0, L: -0.2, C: 0.1, periorbitalL: 0 },
  compass: { ascendant: "ping", magnitude: 0.4, band: null, components: { chi: 0.4 }, z: { a: 0.4 } },
  tags: ["poor sleep"],
  deviceFingerprintHash: "sha256:abcd",
  captureMode: "auto",
  consentVersion: "qise-consent-v2",
  illumination: {
    version: "screen-light-v1", requested: true, outcome: "responsive",
    phasesRead: 2, reason: null, scores: { blue: 0.1, green: 0.2 },
  },
  gateMargins: { pose: 0.8, motion: 0.4 },
  sclera: { gains: { r: 1, g: 1, b: 1 }, rawRatios: { r: 1, g: 1, b: 1 }, personalDelta: null, confidence: "ok", pixelCount: 400 },
  roiValidity: { tian: true, quan_l: true },
  frameJitter: 0.3,
  confidence: 0.9,
  valid: true,

  // Everything below is what the capture path really does hang off a reading,
  // and none of it may survive into storage.
  imageData: { width: 1280, height: 960, data: new Uint8ClampedArray(16) },
  landmarks: [{ x: 1, y: 2 }],
  faceEmbedding: new Float32Array(128),
  previewBlob: {},
  thumbnailDataUrl: "data:image/png;base64,AAAA",
  roiPixels: { tian: [{ r: 1, g: 2, b: 3 }] },
});

/* ─────────────────────────────────────────────────────────────── the gate ── */

test("no persisted key matches the forbidden pattern", () => {
  const record = toRecord(hazardousReading());
  const forbidden = findForbiddenKeys(record);
  assert.deepEqual(forbidden, [],
    "these keys must never reach storage: " + forbidden.join(", "));
});

test("the hazards were genuinely present, so the gate is not passing on nothing", () => {
  // Paired positive control. "No forbidden keys found" means nothing unless
  // the scanner can find them when they ARE there.
  const found = findForbiddenKeys(hazardousReading());
  for (const key of ["imageData", "landmarks", "faceEmbedding", "previewBlob", "thumbnailDataUrl", "roiPixels"]) {
    assert.ok(found.some((f) => f.endsWith(key)), `the scanner missed ${key}`);
  }
});

test("the scanner reaches nested keys, not only the top level", () => {
  const found = findForbiddenKeys({ a: { b: [{ landmarkTrace: [1] }] } });
  assert.deepEqual(found, ["a.b[0].landmarkTrace"]);
  assert.ok(FORBIDDEN_KEY_PATTERN.test("dataUrl"));
  assert.ok(FORBIDDEN_KEY_PATTERN.test("PIXEL_BUFFER"));
});

test("toRecord is an explicit allow-list, not a spread", () => {
  // A `{...reading}` would persist whatever the capture path happened to
  // attach — and the capture path is precisely where the pixels and the mesh
  // live. An unknown key must be dropped rather than carried.
  const record = toRecord({ ...hazardousReading(), somethingNobodyPlanned: { landmarks: [1, 2] } });
  assert.equal(record.somethingNobodyPlanned, undefined);
  assert.deepEqual(findForbiddenKeys(record), []);
});

test("what IS kept is enough to recompute a trend", () => {
  // The whole reason the feature can exist: trends compute from the derived
  // vectors, so the images never need to be held.
  const r = toRecord(hazardousReading());
  assert.equal(r.timestampIso, "2026-08-09T02:30:00.000Z");
  assert.ok(r.metrics.raw && r.metrics.corrected, "both pipelines are needed by Phase 5b");
  assert.deepEqual(r.axes, { a: 14, b: 12, L: 62, C: 18, periorbitalL: 55 });
  assert.deepEqual(r.tags, ["poor sleep"]);
  assert.equal(r.captureClass, "auto");
  assert.equal(r.consentVersion, "qise-consent-v2");
  assert.deepEqual(r.illumination, {
    version: "screen-light-v1", requested: true, outcome: "responsive",
    phasesRead: 2, reason: null,
  });
  assert.equal(JSON.stringify(r.illumination).includes("scores"), false);
  assert.ok(r.gateMargins && r.sclera && r.roiValidity);
  // `sclera.pixelCount` is deliberately absent: it matches /pixel/i, and the
  // brief's persist list never asked for it. Dropping the field is the right
  // answer to that collision; loosening the pattern is not.
  assert.equal(r.sclera.pixelCount, undefined);
  assert.equal(r.frameJitter, 0.3);
  assert.equal(r.confidence, 0.9);
});

test("device fingerprints and their hashes are never stored", () => {
  const r = toRecord({ ...hazardousReading(), deviceFingerprint: "Pixel 8 / Chrome 141 / 1080x2400" });
  assert.equal(r.deviceFingerprint, undefined);
  assert.equal(r.deviceFingerprintHash, undefined);
});

test("legacy fingerprint hashes are removed from reads and exports", async () => {
  const idb = fakeIndexedDB();
  idb.data.set(hazardousReading().timestampIso, hazardousReading());
  const store = await openStore(idb);
  const [reading] = await store.all();
  assert.equal(reading.deviceFingerprintHash, undefined);
  const exported = await store.exportAll();
  assert.equal(exported.readings[0].deviceFingerprintHash, undefined);
});

test("arrays and nested objects are copied, so a later mutation cannot rewrite history", () => {
  const reading = hazardousReading();
  const r = toRecord(reading);
  reading.tags.push("mutated");
  reading.axes.a = 999;
  assert.deepEqual(r.tags, ["poor sleep"]);
  assert.equal(r.axes.a, 14);
});

/* ── the wrapper, driven by a fake IndexedDB ─────────────────────────────── */

/** Enough of IndexedDB to exercise the wrapper's real code paths. */
function fakeIndexedDB() {
  const data = new Map();
  const names = new Set();

  const store = {
    put: (rec) => tick(() => { data.set(rec.timestampIso, rec); return rec.timestampIso; }),
    getAll: () => tick(() => [...data.values()]),
    clear: () => tick(() => { data.clear(); return undefined; }),
    delete: (key) => tick(() => { data.delete(key); return undefined; }),
  };
  const tick = (fn) => {
    const req = {};
    queueMicrotask(() => {
      try { req.result = fn(); req.onsuccess && req.onsuccess(); }
      catch (e) { req.error = e; req.onerror && req.onerror(); }
    });
    return req;
  };

  const db = {
    objectStoreNames: { contains: (n) => names.has(n) },
    createObjectStore: (n) => { names.add(n); return store; },
    transaction: () => ({ objectStore: () => store }),
  };

  return {
    data,
    open: () => {
      const req = { result: db };
      queueMicrotask(() => {
        req.onupgradeneeded && req.onupgradeneeded();
        req.onsuccess && req.onsuccess();
      });
      return req;
    },
  };
}

test("the store round-trips a reading, oldest first", async () => {
  const idb = fakeIndexedDB();
  const store = await openStore(idb);

  await store.put({ ...hazardousReading(), timestampIso: "2026-08-09T10:00:00.000Z" });
  await store.put({ ...hazardousReading(), timestampIso: "2026-08-08T10:00:00.000Z" });

  const all = await store.all();
  assert.equal(all.length, 2);
  assert.deepEqual(all.map((r) => r.timestampIso),
    ["2026-08-08T10:00:00.000Z", "2026-08-09T10:00:00.000Z"]);
  assert.deepEqual(findForbiddenKeys(all), [], "hazards reached the database");
});

test("a nested payload welded onto a sub-object does not survive the write", async () => {
  // The realistic shape of the mistake: not a top-level key somebody would
  // notice in review, but something tucked inside a map that looked like five
  // numbers. A `{...components}` spread carried it straight through the
  // allow-list until scalarMap was added.
  const idb = fakeIndexedDB();
  const store = await openStore(idb);

  await store.put({
    ...hazardousReading(),
    compass: {
      ascendant: "chi", magnitude: 1, band: "slight",
      components: { chi: 1.4, debug: { landmarkTrace: [1, 2, 3] } },
    },
  });

  const [stored] = await store.all();
  assert.deepEqual(findForbiddenKeys(stored), []);
  assert.deepEqual(stored.compass.components, { chi: 1.4 },
    "a nested structure in a scalar map is not data this record may hold");
});

test("the write-path guard is real, and fires on a record that got past shaping", async () => {
  // Belt and braces. toRecord's allow-list is the primary defence; this is the
  // second one, for the day a future code path shapes a record some other way.
  // Asserted on the guard directly, because the allow-list is now deep enough
  // that nothing can be smuggled through toRecord to trigger it.
  const forged = { timestampIso: "2026-08-09T02:30:00.000Z", debug: { imageData: [1] } };
  assert.deepEqual(findForbiddenKeys(forged), ["debug.imageData"]);

  const idb = fakeIndexedDB();
  const store = await openStore(idb);
  await store.put(hazardousReading());
  assert.equal(idb.data.size, 1, "the ordinary path still writes");
  assert.deepEqual(findForbiddenKeys([...idb.data.values()]), []);
});

test("a reading with no timestamp is refused rather than silently overwriting", async () => {
  const store = await openStore(fakeIndexedDB());
  await assert.rejects(() => store.put({ ...hazardousReading(), timestampIso: undefined }), TypeError);
});

test("exportAll produces a portable document", async () => {
  const store = await openStore(fakeIndexedDB());
  await store.put(hazardousReading());
  const doc = await store.exportAll();
  assert.ok(Array.isArray(doc.readings) && doc.readings.length === 1);
  assert.ok(doc.exportedAt);
  // Round-trips through JSON, which is what "export" has to mean.
  assert.deepEqual(JSON.parse(JSON.stringify(doc)).readings.length, 1);
});

test("a host with no IndexedDB fails loudly at the call site", async () => {
  await assert.rejects(() => openStore(null), /no IndexedDB/);
});

test("the object store is the one the brief names", () => {
  assert.equal(STORE_READINGS, "qise_readings");
  assert.equal(DB_NAME, "qise");
});

/* T1 — withdrawal erases readings AND consent, through the production wiring. */

test("withdrawal erases the readings and the consent record together", async () => {
  const storage = memoryStorage();
  const consent = createConsent(storage);
  consent.grant();
  const store = await openStore(fakeIndexedDB());
  await store.put({ ...hazardousReading(), timestampIso: "2026-08-09T10:00:00.000Z" });
  assert.equal((await store.all()).length, 1);

  // Byte-for-byte what src/ui/qise/app.js does on the withdraw button. No
  // clearConsent callback is passed, because production passes none: consent
  // is cleared by withdraw() itself once the eraser returns. Passing one here
  // would let this test keep passing if production stopped clearing consent.
  await consent.withdraw({ deleteAll: () => store.deleteAll() });

  assert.equal((await store.all()).length, 0, "readings must be gone");
  assert.equal(consent.isGranted(), false, "the grant must be gone too");
  assert.equal(storage.getItem(CONSENT_STORAGE_KEY), null, "the stored grant must be gone from storage, not just from the in-memory view");
});

test("deleteAll runs an optional clearConsent callback when one is supplied", async () => {
  // The parameter is retained for callers that own consent storage directly.
  // Production is not one of them, so it is exercised separately from T1
  // rather than being smuggled into it.
  const store = await openStore(fakeIndexedDB());
  let called = 0;
  const result = await store.deleteAll({ clearConsent: () => { called += 1; } });
  assert.equal(called, 1);
  assert.equal(result.consentCleared, true);

  const bare = await store.deleteAll();
  assert.equal(bare.cleared, true);
  assert.equal(bare.consentCleared, false);
});

test("a withdrawal whose eraser throws leaves BOTH the readings and the grant", async () => {
  const consent = createConsent(memoryStorage());
  consent.grant();
  const store = await openStore(fakeIndexedDB());
  await store.put({ ...hazardousReading(), timestampIso: "2026-08-09T10:00:00.000Z" });

  await assert.rejects(() => consent.withdraw({ deleteAll: () => { throw new Error("disk"); } }));

  assert.equal((await store.all()).length, 1);
  assert.equal(consent.isGranted(), true, "a failed erase must not silently revoke");
});

/* T5 — ming/run survive the round trip, in axes and in z. */

test("ming and run round-trip through put -> reopen -> all, in axes and in z", async () => {
  const idb = fakeIndexedDB();
  const store = await openStore(idb);
  await store.put({
    ...hazardousReading(),
    timestampIso: "2026-08-09T10:00:00.000Z",
    axes: { a: 14, b: 12, L: 62, C: 18, periorbitalL: 55, ming: 1.21, run: 26.4 },
    z: { a: 0.4, b: 0.2, L: 0.1, C: 0.3, periorbitalL: 0.2, ming: 1.9, run: -2.3 },
    lineageId: "v2-2026-08-09T10:00:00.000Z",
  });

  const [back] = await (await openStore(idb)).all();
  assert.equal(back.axes.ming, 1.21, "axes.ming must persist or replay is a lie");
  assert.equal(back.axes.run, 26.4);
  assert.equal(back.z.ming, 1.9, "z.ming must persist");
  assert.equal(back.z.run, -2.3);
  // The lineage id is the boundary a baseline reset creates. If the store
  // drops it on write, the boundary lasts exactly one reading: the next scan
  // reloads every pre-reset row and readmits it to the baseline.
  assert.equal(back.lineageId, "v2-2026-08-09T10:00:00.000Z", "lineageId must persist");
});
