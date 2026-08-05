/*
 * MODULE B — the safety referral path's interface to the colorimetry engine.
 *
 * ── THE BOUNDARY THIS FILE IS ──────────────────────────────────────────────
 * Takes the SAME `rawScalars()` input as `adapters/entertainment.js`, and is
 * the only place allowed to turn those neutral scalars into a referral
 * decision. Clinical vocabulary is permitted here and only here.
 *
 * Both adapters sit on one shared measurement layer that neither of them owns
 * (`engine.js`). That is deliberate: if Module B owned the measurement,
 * flag-disabling it would delete Module A's inputs too.
 *
 * ── POLICY THAT IS NOT NEGOTIABLE ──────────────────────────────────────────
 * Referrals are NEVER billed, NEVER paywalled, NEVER behind a subscription, in
 * either build flavour. The feature flag decides whether this module SHIPS, not
 * whether it is charged for. There is no price, tier or entitlement parameter
 * anywhere in this file and there must never be one.
 *
 * ── WORDING ────────────────────────────────────────────────────────────────
 * No referral names a disease. Under TGA s41BD the general health/wellness
 * exclusion (14B) does not apply to software making claims about a serious
 * disease, and EVERY function must qualify or the exclusion is void for the
 * whole product. So a gate fires on the clinical criteria and says only that a
 * clinician should look, plus what to mention. Clinical function preserved, no
 * disease opinion rendered. Enforced by tests/copy-guard.test.js.
 */

import { MODULE_B_SAFETY_REFERRALS, MODULE_B_IS_NEVER_MONETISED } from "../flags.js";
import { DELTA_EI_FULL_SCALE } from "../engine.js";

/**
 * Referral thresholds — THE single source of truth for these numbers.
 *
 * `rules.js` imports these rather than repeating the literals, so a threshold
 * cannot be tuned in one place and left stale in the other. Expressed on the
 * same 0..1 severity scale the rule engine matches on.
 */
export const SAFETY_THRESHOLDS = {
  /** Redness across both cheeks and the nose bridge. */
  MALAR_CHEEK_SEVERITY: 0.45,
  MALAR_BRIDGE_SEVERITY: 0.45,
  /** Smile lines must be SPARED for the pattern to count — involvement there
   *  makes it a different picture, so this is an absence condition. */
  NASOLABIAL_SPARING_SEVERITY: 0.30,
  /** Focal pigmented lesion: out of scope for a wellness tool entirely. */
  PIGMENT_LESION_SEVERITY: 0.5,
};

/** Convert a raw ΔEI to the 0..1 severity scale the thresholds are stated on. */
const severityFromDeltaEi = (d) =>
  Number.isFinite(d) ? Math.min(Math.max(d, 0) / DELTA_EI_FULL_SCALE, 1) : null;

export const isSafetyEnabled = () => MODULE_B_SAFETY_REFERRALS;

/**
 * Evaluate the referral thresholds against raw scalars.
 *
 * @param {{baseline:object, zones:object}} raw `rawScalars()` output
 * @returns {{enabled:boolean, assessable:boolean, referrals:Array, reason:string|null}}
 */
export function evaluateSafety(raw) {
  // Flag off: Module B is not merely hidden, it produces nothing. No caller can
  // render a referral it was never handed.
  if (!MODULE_B_SAFETY_REFERRALS) {
    return { enabled: false, assessable: false, referrals: [], reason: null };
  }

  const zones = raw?.zones ?? {};
  const sev = (key) => severityFromDeltaEi(zones[key]?.deltaEi);

  const cheekL = sev("cheek_left");
  const cheekR = sev("cheek_right");
  const bridge = sev("nose_bridge");

  // Colour is not measurable from this photo — the deep-skin physical limit,
  // or too little skin to set a baseline. REFUSE rather than infer. A gate
  // that silently does not fire because its input was null would read to the
  // user as "nothing found", which is a clinical claim with nothing behind it.
  if (cheekL === null || cheekR === null || bridge === null) {
    return {
      enabled: true,
      assessable: false,
      referrals: [],
      reason: "colourNotMeasurable",
    };
  }

  const nasoL = sev("nasolabial_left") ?? 0;
  const nasoR = sev("nasolabial_right") ?? 0;

  const malar =
    cheekL >= SAFETY_THRESHOLDS.MALAR_CHEEK_SEVERITY &&
    cheekR >= SAFETY_THRESHOLDS.MALAR_CHEEK_SEVERITY &&
    bridge >= SAFETY_THRESHOLDS.MALAR_BRIDGE_SEVERITY &&
    nasoL < SAFETY_THRESHOLDS.NASOLABIAL_SPARING_SEVERITY &&
    nasoR < SAFETY_THRESHOLDS.NASOLABIAL_SPARING_SEVERITY;

  const referrals = [];
  if (malar) {
    referrals.push({
      id: "SG-001-MALAR",
      referralTo: "doctor",
      urgency: "prompt",
      haltTcm: true,
      /** Machine-readable only. The words shown to a user live in Module B's
       *  own copy deck, which is separate from Module A's — that separation is
       *  the reason this boundary exists. */
      patternKey: "rednessBothCheeksAndBridge",
      measured: { cheekLeft: cheekL, cheekRight: cheekR, noseBridge: bridge },
      /** Standing policy, carried on the payload so any billing code that ever
       *  inspects a referral trips over it. */
      billable: false,
    });
  }

  return { enabled: true, assessable: true, referrals, reason: null };
}

/* Asserted by the adapter tests. Exported so the guard is greppable rather
 * than living only in a comment. */
export const SAFETY_IS_NEVER_BILLED = MODULE_B_IS_NEVER_MONETISED;
