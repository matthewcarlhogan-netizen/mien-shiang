/*
 * MODULE B — safety content. Health-adjacent.
 *
 * ── HOW THIS FILE DIFFERS FROM rules-a.js ──────────────────────────────────
 * Clinical vocabulary is permitted here and only here. What is NOT permitted,
 * in either module, is naming a disease: under TGA s41BD the general
 * health/wellness exclusion (14B) does not apply to software making claims
 * about a serious disease, and EVERY function must qualify or the exclusion is
 * void for the whole product. So a gate fires on the clinical criteria and
 * tells the user only that a clinician should look, plus what to mention.
 * Clinical function preserved; no disease opinion rendered.
 *
 * ── SHIPPING AND BILLING ───────────────────────────────────────────────────
 * This whole file is composed into the rule set only when
 * MODULE_B_SAFETY_REFERRALS is true (see src/rules.js). Nothing here is ever
 * billed, paywalled, or placed behind a subscription, in either flavour.
 *
 * ── THE UI OBLIGATION THIS FILE CARRIES ────────────────────────────────────
 * Everything produced here renders beneath MODULE_B_DISCLAIMER, never inside
 * Module A's reading. That separation is the point of the module split: a
 * reader must be able to tell which of two very different kinds of statement
 * they are looking at.
 */

/**
 * Shown above every Module B output. Required by the module boundary, not a
 * decoration — Module A's reading is entertainment and this is not, and the
 * reader is entitled to know which one they are reading.
 */
import { SAFETY_THRESHOLDS } from "./adapters/safety.js";

export const MODULE_B_DISCLAIMER =
  "The note below is not part of the face reading. It comes from a separate " +
  "check that looks only at what the photo can actually measure, and it is " +
  "here for safety rather than interest. It is never a diagnosis.";

export const RULES_B = [
  {
    id: "SG-001-MALAR", category: "safety_gate", salience: 1000,
    describe: "Redness across both cheeks and the nose bridge, with the smile lines spared.",
    // Thresholds come from adapters/safety.js — Module B's adapter owns these
    // numbers, so the rule and the adapter cannot drift apart.
    all: [
      { fact: "observation", zone: "cheek_left", condition: "erythema", severity: { ">=": SAFETY_THRESHOLDS.MALAR_CHEEK_SEVERITY } },
      { fact: "observation", zone: "cheek_right", condition: "erythema", severity: { ">=": SAFETY_THRESHOLDS.MALAR_CHEEK_SEVERITY } },
      { fact: "observation", zone: "nose_bridge", condition: "erythema", severity: { ">=": SAFETY_THRESHOLDS.MALAR_BRIDGE_SEVERITY } },
      { fact: "observation", zone: "nasolabial_left", condition: "erythema", severity: { ">=": SAFETY_THRESHOLDS.NASOLABIAL_SPARING_SEVERITY }, absent: true },
      { fact: "observation", zone: "nasolabial_right", condition: "erythema", severity: { ">=": SAFETY_THRESHOLDS.NASOLABIAL_SPARING_SEVERITY }, absent: true },
    ],
    then: {
      haltTcm: true, urgency: "prompt", referralTo: "doctor",
      message: "This photo shows a pattern of facial redness a clinician should look at. The reading is paused. Please book an appointment and mention redness across both cheeks and the bridge of your nose.",
    },
  },
  {
    id: "SG-003-PIGMENT", category: "safety_gate", salience: 980,
    describe: "Focal pigmented lesion — outside the scope of this tool.",
    all: [{ fact: "observation", condition: "focal_pigmented_lesion", severity: { ">=": SAFETY_THRESHOLDS.PIGMENT_LESION_SEVERITY } }],
    then: {
      haltTcm: true, urgency: "prompt", referralTo: "dermatologist",
      message: "This tool doesn't assess moles, spots or pigmented marks, and has stopped its analysis. Please have it looked at by a doctor or dermatologist.",
    },
  },
  {
    /*
     * Relocated from TCM-202-DAMP-HEAT.recommend[1] in Module A.
     *
     * The original wording named two diseases and asserted that they present
     * as the measured facial pattern — a claim with nothing behind it, sitting
     * in the entertainment module, and the cause of the long-standing
     * copy-guard failure. It is health-adjacent content, so it belongs here,
     * under the Module B disclaimer, and Module A keeps no replacement.
     *
     * An advisory, not a gate: it does not halt the reading and carries no
     * urgency. It is a note, and it is styled as one.
     */
    id: "SG-010-PERSISTENT-PATTERN", category: "safety_advisory", salience: 900,
    describe: "A combined digestive and reserve pattern, which is worth mentioning if it persists.",
    all: [{ fact: "imbalance", name: "Damp-Heat" }],
    then: {
      message: "Some complexion patterns like this are sometimes associated with changes in circulation or iron levels. If you notice this persisting, it may be worth mentioning to a doctor — not as a diagnosis, just as something to keep in mind.",
      recommend: [],
    },
  },
];
