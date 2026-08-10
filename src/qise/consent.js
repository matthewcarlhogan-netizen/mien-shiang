/*
 * PHASE 0 — Consent, and the assertion that makes it load-bearing.
 *
 * ── WHY THIS IS THE FIRST FILE, NOT A LATE POLISH ──────────────────────────
 * Under the Australian Privacy Act, generating a 478-point facial mesh in RAM
 * and discarding it milliseconds later is still *collection* of sensitive
 * information. Transience is not a defence. The Administrative Review Tribunal
 * revisited exactly this in the Bunnings facial-recognition matter on
 * 4 February 2026: it set aside part of the 2024 OAIC determination, but it
 * AFFIRMED that information need not persist to count as collection, and
 * affirmed the APP 1 (transparency) and APP 5 (notification) breaches. The
 * APP 3.3 consent finding fell only because a "permitted general situation"
 * covered loss prevention in retail — a carve-out a consumer wellness app
 * cannot invoke.
 *
 * The net effect for us is the opposite of a relaxation: the two obligations
 * most clearly upheld on appeal are transparency and pre-collection notice,
 * which are precisely what this gate discharges. The same screen discharges
 * EU AI Act Art. 50(3) (biometric categorisation transparency), which requires
 * disclosure at or before first exposure — prominent, not buried in a policy.
 *
 * ── WHY WITHDRAWAL TAKES THE ERASER AS AN ARGUMENT ─────────────────────────
 * `withdraw()` REQUIRES a `deleteAll` function and throws without one. A
 * withdraw button that clears the consent flag and leaves the readings behind
 * is the failure this shape makes unrepresentable: the coupling is structural,
 * not a convention the next screen has to remember.
 *
 * Storage is injected for the same reason `createLandmarkerWithFallback()`
 * takes its factory (CLAUDE.md item 14) — a gate nothing can execute under
 * `node --test` is a gate nobody has run.
 */

/** Bump on any material change to processing. A mismatch re-prompts. */
export const CONSENT_VERSION = "qise-consent-v2";

export const CONSENT_STORAGE_KEY = "qise.consent";

/**
 * Thrown when anything on the capture path runs before consent exists.
 * Carries a `code` so a caller can branch without matching on prose.
 */
export class ConsentRequiredError extends Error {
  constructor(what = "this operation") {
    super(`${what} ran before consent was granted; the gate is not decorative`);
    this.name = "ConsentRequiredError";
    this.code = "CONSENT_REQUIRED";
  }
}

/** In-memory storage, for tests and for any host without localStorage. */
export function memoryStorage(seed = null) {
  const cell = { value: seed };
  return {
    getItem: (k) => (k === CONSENT_STORAGE_KEY ? cell.value : null),
    setItem: (k, v) => { if (k === CONSENT_STORAGE_KEY) cell.value = String(v); },
    removeItem: (k) => { if (k === CONSENT_STORAGE_KEY) cell.value = null; },
  };
}

function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined" && localStorage) return localStorage;
  } catch {
    // Storage can throw rather than be absent — Safari private mode, and any
    // embedded browser with cookies blocked. Falling back to memory means
    // consent is asked for every session, which is the safe direction: it
    // over-prompts rather than assuming a grant that was never recorded.
    // Deliberately not swallowed silently; see the warning below.
    console.warn("qise/consent: persistent storage unavailable, consent will be asked every session");
  }
  return memoryStorage();
}

/** Is this a well-formed record for the CURRENT processing version? */
function isCurrentGrant(record) {
  return Boolean(
    record &&
    record.granted === true &&
    record.version === CONSENT_VERSION &&
    typeof record.timestampIso === "string" &&
    !Number.isNaN(Date.parse(record.timestampIso))
  );
}

/**
 * @param {{getItem:Function,setItem:Function,removeItem:Function}} [storage]
 * @param {{now?:() => Date}} [deps]
 */
export function createConsent(storage = defaultStorage(), deps = {}) {
  const now = deps.now ?? (() => new Date());

  function read() {
    const raw = storage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // A corrupt record is not a grant. Fail closed and re-prompt, the same
      // way shareGate.js fails closed on an unparseable expiry.
      return null;
    }
  }

  return {
    /** The stored record, or null. Never inferred, never defaulted. */
    read,

    /**
     * True only for a current, well-formed grant. A record written against an
     * older processing version reads as NOT granted, which is what forces the
     * re-prompt when `CONSENT_VERSION` is bumped.
     */
    isGranted() {
      return isCurrentGrant(read());
    },

    /** True when a grant exists but names a superseded processing version. */
    isStale() {
      const r = read();
      return Boolean(r && r.granted === true && r.version !== CONSENT_VERSION);
    },

    grant() {
      const record = {
        granted: true,
        version: CONSENT_VERSION,
        timestampIso: now().toISOString(),
      };
      storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      return record;
    },

    /**
     * Withdraw and erase, in that order, as one operation.
     *
     * `deleteAll` is mandatory. Withdrawal that leaves the readings behind is
     * not withdrawal, and making the eraser a required argument means no
     * caller can forget it.
     *
     * @param {{deleteAll: () => (void|Promise<void>)}} options
     */
    async withdraw(options) {
      const deleteAll = options && options.deleteAll;
      if (typeof deleteAll !== "function") {
        throw new TypeError(
          "withdraw() requires a deleteAll function: consent cannot be revoked " +
          "while the readings it authorised are still on the device"
        );
      }
      await deleteAll();
      storage.removeItem(CONSENT_STORAGE_KEY);
      return { granted: false, erased: true };
    },
  };
}

/**
 * The runtime assertion Phase 0a is about.
 *
 * Called at the top of every function that opens a camera or builds a face
 * mesh. It throws rather than returning false on purpose: a boolean can be
 * ignored by a caller that forgot to check it, and the whole point is that
 * there is no path around this.
 */
export function assertConsentGranted(consent, what = "the capture path") {
  if (!consent || typeof consent.isGranted !== "function" || !consent.isGranted()) {
    throw new ConsentRequiredError(what);
  }
  return true;
}
