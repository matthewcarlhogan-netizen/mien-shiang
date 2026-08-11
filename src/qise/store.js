/*
 * PHASE 7 — persistence.
 *
 * ── WHAT MAY BE STORED, AND WHY THE LIST IS SHORT ──────────────────────────
 * Derived observation vectors, and nothing a face could be reconstructed or
 * recognised from. No image, no ROI pixels, no landmark coordinates, no
 * embeddings. A 478-point mesh IS a biometric template: in Australia that is
 * sensitive information under the Privacy Act, in Illinois it carries a
 * private right of action with per-violation statutory damages under BIPA, and
 * Washington's My Health My Data Act is broader still. The safest way to hold
 * biometric data is not to.
 *
 * Trends compute perfectly well from the derived vectors, which is the whole
 * reason this feature can exist at all.
 *
 * ── WHY THE RECORD SHAPE IS A PURE FUNCTION ────────────────────────────────
 * `toRecord()` is separated from the IndexedDB wrapper so the assertion that
 * matters — that no persisted key looks like an image, a pixel, a landmark or
 * an embedding — runs under `node --test` against the real shaping code,
 * rather than against a description of it. A privacy guarantee tested only
 * through a database mock is a guarantee about the mock.
 */

export const DB_NAME = "qise";
export const DB_VERSION = 1;
export const STORE_READINGS = "qise_readings";

/**
 * Keys that must never appear in a persisted record, at any depth.
 *
 * Enforced positively by `toRecord` building an explicit object, and again
 * negatively by `findForbiddenKeys` — belt and braces, because the failure
 * mode is silent and the consequence is a category of data this product has
 * promised never to hold.
 */
export const FORBIDDEN_KEY_PATTERN = /image|pixel|landmark|embedding|blob|dataUrl/i;

/** The five colours a compass component may be keyed by. */
const COMPASS_COMPONENTS = Object.freeze(["qing", "chi", "huang", "bai", "hei"]);

/**
 * Keep the scalars, drop everything else.
 *
 * ── WHY A SPREAD IS NOT AN ALLOW-LIST ──────────────────────────────────────
 * `{...r.compass.components}` looked like a copy of a map of five numbers, and
 * it is — right up until something hangs a debug payload off it. Then the
 * spread carries the payload straight through the allow-list the rest of this
 * function is built on, and the record has landmark data in it under a key
 * nobody would think to look at. That was a live defect here, caught by the
 * Phase 7 gate scanning three levels down.
 *
 * So every map persisted from this file passes through a filter that keeps
 * numbers, booleans, strings and null, and drops objects and arrays. A nested
 * structure in one of these maps is not data this record is allowed to hold.
 */
function scalarMap(obj, allowKeys = null) {
  if (!obj || typeof obj !== "object") return null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (allowKeys && !allowKeys.includes(k)) continue;
    if (v === null || ["number", "boolean", "string"].includes(typeof v)) out[k] = v;
  }
  return out;
}

/**
 * Shape one reading for storage. Explicit allow-list, never a spread.
 *
 * A `{...reading}` here would persist whatever the capture path happened to
 * hang off the object — and the capture path is precisely where the pixels and
 * the mesh live.
 */
export function toRecord(reading) {
  const r = reading || {};
  return {
    timestampIso: r.timestampIso,

    // Both pipelines. Phase 5b needs both, and whichever loses stays stored.
    metrics: {
      raw: cleanMetrics(r.metrics && r.metrics.raw),
      corrected: cleanMetrics(r.metrics && r.metrics.corrected),
    },

    axes: scalarMap(r.axes),
    deltas: scalarMap(r.deltas),
    compass: r.compass ? {
      ascendant: r.compass.ascendant ?? null,
      magnitude: r.compass.magnitude ?? null,
      band: r.compass.band ?? null,
      components: scalarMap(r.compass.components, COMPASS_COMPONENTS),
    } : null,

    tags: Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === "string") : [],

    // A HASH of the device fingerprint, not the fingerprint. The only question
    // ever asked of it is "is this the same device as last time", and a hash
    // answers that without storing an identifier that could be correlated
    // against anything else.
    deviceFingerprintHash: r.deviceFingerprintHash ?? null,
    captureMode: r.captureMode ?? null,
    captureTier: r.captureTier ?? null,
    readingState: r.readingState ?? null,
    baselineProgress: Number.isInteger(r.baselineProgress) ? r.baselineProgress : null,
    consentVersion: r.consentVersion ?? null,

    // Categorical experiment metadata only. Raw reflected channel responses
    // are removed before this boundary by publicIlluminationSummary().
    illumination: r.illumination ? {
      version: r.illumination.version ?? null,
      requested: Boolean(r.illumination.requested),
      outcome: r.illumination.outcome ?? "skipped",
      phasesRead: Number.isInteger(r.illumination.phasesRead) ? r.illumination.phasesRead : 0,
      reason: r.illumination.reason ?? null,
    } : null,
    composition: r.composition ? {
      basis: r.composition.basis ?? null,
      lead: r.composition.lead ?? null,
      support: r.composition.support ?? null,
      segments: scalarMap(r.composition.segments, COMPASS_COMPONENTS),
    } : null,

    gateMargins: scalarMap(r.gateMargins),

    sclera: r.sclera ? {
      gains: scalarMap(r.sclera.gains, ["r", "g", "b"]),
      rawRatios: scalarMap(r.sclera.rawRatios, ["r", "g", "b"]),
      // `mads` is a nested object and is deliberately not carried: the delta
      // is what a later reading is compared against, and the MADs behind it
      // are recomputed from the history every time.
      personalDelta: scalarMap(r.sclera.personalDelta, ["r", "g", "b"]),
      confidence: r.sclera.confidence ?? null,
      // No `pixelCount`. It is a scalar integer and harmless in itself, but it
      // matches /pixel/i and so trips the Phase 7 guard — and the right
      // response to a guard firing on a field the brief never asked for is to
      // drop the field, not to loosen the pattern. Loosening it is how the
      // next thing called `...Pixels` gets through.
    } : null,

    // Per-region VALIDITY, which is a boolean and a reason — never the region's
    // geometry and never its contents.
    roiValidity: scalarMap(r.roiValidity),

    frameJitter: r.frameJitter ?? null,
    confidence: r.confidence ?? null,
    valid: r.valid !== false,
  };
}

function cleanMetrics(m) {
  if (!m) return null;
  return {
    hueVector: m.hueVector ? { a: m.hueVector.a, b: m.hueVector.b } : null,
    ming: m.ming ?? null,
    run: m.run ?? null,
    han: m.han ?? null,
    xue: m.xue ?? null,
    meanChroma: m.meanChroma ?? null,
    meanL: m.meanL ?? null,
    periorbitalL: m.periorbitalL ?? null,
    basis: m.basis ?? null,
    roisRead: m.roisRead ?? null,
  };
}

/** Every forbidden key found anywhere in a value. Used by the Phase 7 gate. */
export function findForbiddenKeys(value, path = "", found = []) {
  if (value === null || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((v, i) => findForbiddenKeys(v, `${path}[${i}]`, found));
    return found;
  }
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_KEY_PATTERN.test(k)) found.push(`${path}${path ? "." : ""}${k}`);
    findForbiddenKeys(v, `${path}${path ? "." : ""}${k}`, found);
  }
  return found;
}

/* ── the IndexedDB wrapper ───────────────────────────────────────────────── */

const request = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error || new Error("qise/store: request failed"));
});

/**
 * Open the store.
 *
 * The factory is injected for the same reason everything else here is: so the
 * wrapper can be driven under `node --test` by a fake, and so a host with no
 * IndexedDB fails loudly at the call site rather than at some later `undefined`.
 */
export async function openStore(indexedDBFactory) {
  const idb = indexedDBFactory || (typeof indexedDB !== "undefined" ? indexedDB : null);
  if (!idb) throw new Error("qise/store: no IndexedDB available on this host");

  const req = idb.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE_READINGS)) {
      db.createObjectStore(STORE_READINGS, { keyPath: "timestampIso" });
    }
  };
  const db = await request(req);

  const tx = (mode) => db.transaction(STORE_READINGS, mode).objectStore(STORE_READINGS);

  return {
    db,

    async put(reading) {
      const record = toRecord(reading);
      if (!record.timestampIso) throw new TypeError("qise/store: a reading needs a timestamp to be keyed by");

      // The guard runs on every write, not only in tests. A record shaped by a
      // future code path that forgot the allow-list must fail here rather than
      // reach the disk.
      const forbidden = findForbiddenKeys(record);
      if (forbidden.length) {
        throw new Error(`qise/store: refusing to persist ${forbidden.join(", ")} — `
          + "no image, pixel, landmark or embedding data may be stored");
      }
      await request(tx("readwrite").put(record));
      return record;
    },

    /** Oldest first, which is the order every consumer here wants. */
    async all() {
      const rows = await request(tx("readonly").getAll());
      return (rows || []).sort((a, b) => String(a.timestampIso).localeCompare(String(b.timestampIso)));
    },

    async exportAll() {
      return { exportedAt: new Date().toISOString(), version: DB_VERSION, readings: await this.all() };
    },

    /**
     * Wipe the object store AND the consent record, together.
     *
     * The consent eraser is passed in rather than imported so that the store
     * does not reach into another module's storage, but it is not optional:
     * deleting the readings and leaving a standing grant behind is the shape
     * of "delete everything" that deletes not-quite-everything.
     */
    async deleteAll({ clearConsent } = {}) {
      await request(tx("readwrite").clear());
      if (typeof clearConsent === "function") clearConsent();
      return { cleared: true, consentCleared: typeof clearConsent === "function" };
    },
  };
}
