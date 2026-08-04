/*
 * Facial zones + forward-chaining rule engine (browser port).
 *
 * LATERALITY — verified against MediaPipe's own FaceLandmarksConnections:
 *   FACE_LANDMARKS_RIGHT_EYE contains 33, 133
 *   FACE_LANDMARKS_LEFT_EYE  contains 263, 362
 * So MediaPipe names sides from the SUBJECT's anatomy: 234 is the subject's
 * RIGHT, 454 the subject's LEFT. The original spec had these swapped, which
 * would invert the whole Liver/Lung cheek distinction.
 *
 * Front cameras mirror the preview, which inverts laterality AGAIN — so the
 * capture path un-mirrors before landmarking.
 */

export const ROIS = {
  glabella: {
    label: "Glabella", hanzi: "肝", side: "midline",
    correspondence: "Liver — detoxification, emotional regulation",
    idx: [9, 151, 108, 107, 55, 8, 285, 336, 337], pad: 0.14,
  },
  center_forehead: {
    label: "Central forehead", hanzi: "小腸", side: "midline",
    correspondence: "Small Intestine, Bladder",
    idx: [10, 21, 54, 67, 251, 284, 297], pad: 0.16,
  },
  periorbital_right: {
    label: "Under eye (your right)", hanzi: "腎", side: "right",
    correspondence: "Kidney — fluid balance",
    idx: [33, 133, 7, 144, 145, 153, 154, 155, 246], pad: 0.22,
  },
  periorbital_left: {
    label: "Under eye (your left)", hanzi: "腎", side: "left",
    correspondence: "Kidney — fluid balance",
    idx: [263, 362, 373, 374, 380, 381, 382, 249, 466], pad: 0.22,
  },
  nose_bridge: {
    label: "Nose bridge", hanzi: "心", side: "midline",
    correspondence: "Heart — cardiovascular",
    idx: [6, 197, 195, 5, 168], pad: 0.10,
  },
  nose_apex: {
    label: "Nose tip", hanzi: "心", side: "midline",
    correspondence: "Heart — cardiovascular",
    idx: [4, 1, 19, 94, 2, 98, 327, 129, 358], pad: 0.10,
  },
  cheek_right: {
    label: "Cheek (your right)", hanzi: "肺", side: "right",
    correspondence: "Lung — respiratory, environment",
    idx: [234, 118, 119, 100, 120, 47, 126, 209], pad: 0.06,
  },
  cheek_left: {
    label: "Cheek (your left)", hanzi: "肝", side: "left",
    correspondence: "Liver — emotional stress",
    idx: [454, 347, 348, 329, 349, 277, 355, 429], pad: 0.06,
  },
  nasolabial_right: {
    label: "Smile line (your right)", hanzi: "大腸", side: "right",
    correspondence: "Large Intestine",
    idx: [129, 209, 49, 64, 98, 97, 165, 92], pad: 0.10,
  },
  nasolabial_left: {
    label: "Smile line (your left)", hanzi: "大腸", side: "left",
    correspondence: "Large Intestine",
    idx: [358, 429, 279, 294, 327, 326, 391, 322], pad: 0.10,
  },
  perioral_upper: {
    label: "Upper lip area", hanzi: "胃", side: "midline",
    correspondence: "Stomach — digestive heat",
    idx: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291], pad: 0.12,
  },
  chin: {
    label: "Chin", hanzi: "腎", side: "midline",
    correspondence: "Kidney, endocrine",
    idx: [152, 148, 149, 150, 377, 378, 379, 176, 400, 175], pad: 0.10,
  },
};

// ------------------------------------------------------------------ rules ---
/*
 * Safety gates carry salience 900+ and pre-empt everything.
 *
 * NOTE ON WORDING: no gate names a disease to the user. That isn't squeamish —
 * TGA exclusion 14B (general health/wellness software) does not apply to
 * software making claims about a serious disease, and EVERY function must
 * qualify or the exclusion is void for the whole product. The clinical purpose
 * is preserved: the user is told to see a doctor and what to mention.
 */
export const RULES = [
  {
    id: "SG-001-MALAR", category: "safety_gate", salience: 1000,
    describe: "Redness across both cheeks and the nose bridge, with the smile lines spared.",
    all: [
      { fact: "observation", zone: "cheek_left", condition: "erythema", severity: { ">=": 0.45 } },
      { fact: "observation", zone: "cheek_right", condition: "erythema", severity: { ">=": 0.45 } },
      { fact: "observation", zone: "nose_bridge", condition: "erythema", severity: { ">=": 0.45 } },
      { fact: "observation", zone: "nasolabial_left", condition: "erythema", severity: { ">=": 0.30 }, absent: true },
      { fact: "observation", zone: "nasolabial_right", condition: "erythema", severity: { ">=": 0.30 }, absent: true },
    ],
    then: {
      haltTcm: true, urgency: "prompt", referralTo: "doctor",
      message: "This photo shows a pattern of facial redness a clinician should look at. Wellness suggestions are paused. Please book an appointment and mention redness across both cheeks and the bridge of your nose.",
    },
  },
  {
    id: "SG-003-PIGMENT", category: "safety_gate", salience: 980,
    describe: "Focal pigmented lesion — outside the scope of a wellness tool.",
    all: [{ fact: "observation", condition: "focal_pigmented_lesion", severity: { ">=": 0.5 } }],
    then: {
      haltTcm: true, urgency: "prompt", referralTo: "dermatologist",
      message: "This tool doesn't assess moles, spots or pigmented marks, and has stopped its analysis. Please have it looked at by a doctor or dermatologist.",
    },
  },
  {
    id: "TCM-101-LIVER-QI", category: "tcm", salience: 100,
    describe: "Deep vertical lines between the brows read as Liver Qi Stagnation.",
    all: [{ fact: "observation", zone: "glabella", condition: "deep_rhytide_vertical", severity: { ">=": 0.7 } }],
    then: {
      assert: { fact: "imbalance", name: "Liver Qi Stagnation", system: "Liver" },
      message: "In the Mien Shiang tradition, sustained tension between the brows is read as constrained Liver Qi — a pattern associated with held frustration.",
      recommend: [
        "Build in a daily wind-down that isn't a screen — a walk, stretching, or breathwork.",
        "Notice whether alcohol intake tracks with your more stressful weeks.",
        "Consistent sleep and wake times do more for this pattern than any single intervention.",
      ],
    },
  },
  {
    id: "TCM-102-STOMACH-HEAT", category: "tcm", salience: 100,
    describe: "Dryness or irritation around the mouth reads as Stomach Heat.",
    all: [{ fact: "observation", zone: "perioral_upper", condition: ["xerosis"], severity: { ">=": 0.4 } }],
    then: {
      assert: { fact: "imbalance", name: "Stomach Heat", system: "Stomach" },
      message: "The area around the mouth is the traditional window onto the stomach; irritation here is read as digestive heat.",
      recommend: [
        "Favour cooked and warm foods over raw and chilled for a fortnight and see whether it tracks.",
        "Eat at consistent times rather than in one late block.",
        "Persistent mouth ulcers are worth raising with a doctor or dentist — they have causes this framework doesn't cover.",
      ],
    },
  },
  {
    id: "TCM-103-KIDNEY-QI", category: "tcm", salience: 100,
    describe: "Darkening under both eyes reads as Kidney Qi deficiency.",
    all: [
      { fact: "observation", zone: "periorbital_left", condition: "hyperpigmentation", severity: { ">=": 0.5 } },
      { fact: "observation", zone: "periorbital_right", condition: "hyperpigmentation", severity: { ">=": 0.5 } },
    ],
    then: {
      assert: { fact: "imbalance", name: "Kidney Qi Deficiency", system: "Kidney" },
      message: "Shadowing under both eyes is read in this tradition as depleted Kidney Qi — the pattern classically tied to rest and reserve.",
      recommend: [
        "Protect sleep duration before optimising anything else about sleep.",
        "Check evening fluid and salt against morning puffiness.",
        "Darkening under the eyes is very often just constitutional or allergic rather than anything to fix.",
      ],
    },
  },
  {
    id: "TCM-104-LUNG-DRY", category: "tcm", salience: 100,
    describe: "Dryness or paleness on the right cheek reads as Lung dryness.",
    all: [{ fact: "observation", zone: "cheek_right", condition: ["xerosis", "pallor"], severity: { ">=": 0.5 } }],
    then: {
      assert: { fact: "imbalance", name: "Lung Dryness", system: "Lung" },
      message: "Your right cheek is the traditional Lung correspondence; dryness here is read as Lung dryness.",
      recommend: [
        "Check indoor humidity and heating — this pattern is usually environmental.",
        "A bland occlusive moisturiser at night is the highest-yield change.",
      ],
    },
  },
  {
    id: "TCM-202-DAMP-HEAT", category: "tcm", salience: 80,
    describe: "Stomach Heat with a Kidney pattern reads as combined Damp-Heat.",
    all: [
      { fact: "imbalance", name: "Stomach Heat" },
      { fact: "imbalance", name: "Kidney Qi Deficiency" },
    ],
    then: {
      assert: { fact: "imbalance", name: "Damp-Heat", system: "Spleen-Stomach" },
      message: "Digestive and rest-related patterns appearing together are read as Damp-Heat — one combined pattern rather than two separate ones.",
      recommend: [
        "Treat these as one thing: regular meal timing and regular sleep timing move together.",
        "If fatigue is the dominant symptom rather than the skin, get bloods done — anaemia and thyroid problems present this way and this tool can't see them.",
      ],
    },
  },
];

const OPS = {
  ">": (a, b) => a > b, ">=": (a, b) => a >= b,
  "<": (a, b) => a < b, "<=": (a, b) => a <= b,
  "==": (a, b) => a === b, "!=": (a, b) => a !== b,
};

function matches(cond, f) {
  if (f.fact !== cond.fact) return false;
  for (const [k, expected] of Object.entries(cond)) {
    if (k === "fact" || k === "absent") continue;
    const actual = f[k];
    if (actual === undefined) return false;
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else if (expected && typeof expected === "object") {
      for (const [op, operand] of Object.entries(expected)) {
        if (!OPS[op](actual, operand)) return false;
      }
    } else if (actual !== expected) return false;
  }
  return true;
}

const keyOf = (f) =>
  [f.fact, f.zone && `zone=${f.zone}`, f.condition && `condition=${f.condition}`,
   f.name && `name=${f.name}`].filter(Boolean).join("|");

/** Forward chaining with a salience agenda and refractoriness.
 *  Derived `imbalance` facts re-enter working memory, so rules chain. */
export function runRules(facts) {
  const wm = new Map();
  for (const f of facts) wm.set(keyOf(f), f);

  const fired = new Set();
  const rules = [...RULES].sort((a, b) => b.salience - a.salience);
  const out = { referrals: [], recommendations: [], trace: [], halted: false, haltedBy: null };

  for (let cycle = 1; cycle <= 16; cycle++) {
    let changed = false;

    for (const rule of rules) {
      if (out.halted && rule.category !== "safety_gate") continue;

      const pools = [];
      let ok = true;
      for (const cond of rule.all) {
        const hits = [...wm.entries()].filter(([, f]) => matches(cond, f)).map(([k]) => k);
        if (cond.absent) { if (hits.length) { ok = false; break; } continue; }
        if (!hits.length) { ok = false; break; }
        pools.push(hits);
      }
      if (!ok) continue;

      let combos = [[]];
      for (const pool of pools) {
        const next = [];
        for (const c of combos) for (const h of pool) next.push([...c, h]);
        combos = next;
        if (combos.length > 2000) break;   // guard against blowup
      }

      for (const binding of combos) {
        const sig = `${rule.id}|${[...binding].sort().join(",")}`;
        if (fired.has(sig)) continue;
        fired.add(sig);
        changed = true;

        if (rule.then.assert) {
          const nf = { ...rule.then.assert, derivedBy: rule.id, because: binding };
          const k = keyOf(nf);
          if (!wm.has(k)) wm.set(k, nf);
        }
        if (rule.then.haltTcm && !out.halted) {
          out.halted = true; out.haltedBy = rule.id;
        }
        const measured = binding
          .map((k) => wm.get(k))
          .filter((f) => f && f.measured)
          .map((f) => `${f.zone}: ${Object.entries(f.measured)
            .map(([mk, mv]) => `${mk}=${(+mv).toFixed(2)}`).join(", ")}`)
          .join("; ");

        if (rule.category === "safety_gate") {
          out.referrals.push({ rule: rule.id, ...rule.then, measured });
        } else {
          out.recommendations.push({
            rule: rule.id, name: rule.then.assert?.name,
            message: rule.then.message, recommend: rule.then.recommend || [], measured,
          });
        }
        out.trace.push({ rule: rule.id, category: rule.category, describe: rule.describe, cycle });
      }
    }
    if (!changed) break;
  }

  // A gate pre-empts, but if TCM rules fired first in the same pass, withdraw
  // them — a referral must not sit next to reassuring lifestyle advice.
  if (out.halted) {
    out.recommendations = [];
    out.trace = out.trace.map((t) =>
      t.category === "safety_gate" ? t : { ...t, withdrawn: true });
  }
  return out;
}
