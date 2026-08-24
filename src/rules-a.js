/*
 * MODULE A — reading content. Entertainment.
 *
 * ── RULES EVERY STRING IN THIS FILE OBEYS ──────────────────────────────────
 *
 * 1. TRADITION-ATTRIBUTED, NEVER ASSERTIVE. Not "you are patient" but
 *    "classical Chinese face reading associates this with patience". The
 *    reading describes what a tradition says, never what the person is.
 *
 * 2. THE SOURCE IS NAMED INLINE, never as a generic "tradition":
 *      Chinese  — "In Mian Xiang…" / "Classical Chinese face reading…"
 *      Western  — "Lavater (1778) observed…" / "In the Western physiognomy
 *                  tradition…"
 *      Agreement — "Both Chinese and Western traditions associate…"
 *      Disagreement — name both positions, in `sourcesDiffer`.
 *
 * 3. NO HEALTH VOCABULARY. The blocklist is enforced by
 *    tests/copy-guard.test.js against every string reachable from this file.
 *    It includes "circulation", "iron" and "blood", which belong to Module B
 *    only.
 *
 * 4. WARM, PLAUSIBLE, NEVER A VERDICT. Copy may be specific-sounding and
 *    generous. It may never be anxiety-inducing and may never deliver a
 *    negative judgement about a person's character or future. Where the
 *    framing rule and the wish to sound personal pull against each other, the
 *    framing rule wins and the sentence gets rewritten as tradition.
 *
 * ── ON THE ABSENCE AT TCM-202 ──────────────────────────────────────────────
 * TCM-202's second recommendation used to point at blood tests. That is
 * health-adjacent content and it has moved to rules-b.js, where it sits under
 * Module B's own disclaimer. It is deliberately NOT replaced here. Module A
 * having nothing to say on that point is the correct outcome, not a gap to
 * fill — a substitute would recreate the health claim in softer words.
 */

/**
 * Zone correspondences — Module A's interpretation of the measurement zones
 * defined in zones.js.
 *
 * These were previously fields on the ROI definitions themselves, phrased as
 * physiological function ("Liver — detoxification, emotional regulation").
 * That asserted a fact about the body inside the entertainment module. They
 * are now what they always actually were: a tradition's reading, attributed.
 */
export const ZONE_READINGS = {
  glabella: {
    correspondence: "Liver — in Mian Xiang, the seat of planning, and of frustration held rather than spoken",
  },
  center_forehead: {
    correspondence: "Small Intestine and Bladder — in Mian Xiang, the zone of early life and of what was inherited",
  },
  periorbital_right: {
    correspondence: "Kidney — in Mian Xiang, the store of reserve and stamina",
  },
  periorbital_left: {
    correspondence: "Kidney — in Mian Xiang, the store of reserve and stamina",
  },
  nose_bridge: {
    correspondence: "Heart — in Mian Xiang, warmth, and how feeling shows on a face",
  },
  nose_apex: {
    correspondence: "Heart — in Mian Xiang, the palace of wealth and of what a person gathers",
  },
  cheek_right: {
    correspondence: "Lung — in Mian Xiang, breath, boundaries, and what the skin meets",
  },
  cheek_left: {
    correspondence: "Liver — in Mian Xiang, drive, and how strain is carried",
  },
  nasolabial_right: {
    correspondence: "Large Intestine — in Mian Xiang, the lines of standing and of long work",
  },
  nasolabial_left: {
    correspondence: "Large Intestine — in Mian Xiang, the lines of standing and of long work",
  },
  perioral_upper: {
    correspondence: "Stomach — in Mian Xiang, appetite, and the rhythm a person keeps",
  },
  chin: {
    correspondence: "Kidney — in Mian Xiang, reserve, resolve, and the later years",
  },
};

export const RULES_A = [
  {
    id: "TCM-101-LIVER-QI", category: "reading", salience: 100,
    describe: "Settled vertical lines between the brows.",
    all: [{ fact: "observation", zone: "glabella", condition: "deep_rhytide_vertical", severity: { ">=": 0.7 } }],
    then: {
      assert: { fact: "imbalance", name: "Liver Qi Stagnation", system: "Liver" },
      message: "In Mian Xiang the space between the brows is the Seal Hall, and settled lines there are read as Liver Qi holding rather than moving — the classical picture of someone who carries things quietly rather than putting them down.",
      recommend: [
        "The classical pairing for this reading is a daily wind-down that isn't a screen — a walk, stretching, or breathwork.",
        "Mian Xiang reads this pattern as easing with regular hours more than with any single change, so consistent sleep and waking times are where it starts.",
        "The texts describe this as a mark of people who hold a lot without complaint, which they read as strength rather than fault.",
      ],
      sourcesDiffer: "Sources differ on this — Ming-era texts read the Seal Hall as a sign of held frustration, while other classical commentaries read the same lines as a mark of long concentration and deep focus.",
    },
  },
  {
    id: "TCM-102-STOMACH-HEAT", category: "reading", salience: 100,
    describe: "Dryness or roughness around the mouth.",
    all: [{ fact: "observation", zone: "perioral_upper", condition: ["xerosis"], severity: { ">=": 0.4 } }],
    then: {
      assert: { fact: "imbalance", name: "Stomach Heat", system: "Stomach" },
      message: "Classical Chinese face reading places the area around the mouth as the window onto the Stomach, and reads dryness or roughness there as digestive heat — a rhythm running hotter and faster than it wants to.",
      recommend: [
        "The classical suggestion is warm, cooked food over raw and chilled for a fortnight, and simply noticing whether anything tracks with it.",
        "Eating at consistent times rather than in one late block is the other half of the traditional advice.",
      ],
      sourcesDiffer: "Sources differ on this — some Ming-era texts read the upper lip and the area beneath the nose as two separate zones with different meanings, while later popular systems merge them into one.",
    },
  },
  {
    id: "TCM-103-KIDNEY-QI", category: "reading", salience: 100,
    describe: "Shadowing under both eyes.",
    all: [
      { fact: "observation", zone: "periorbital_left", condition: "hyperpigmentation", severity: { ">=": 0.5 } },
      { fact: "observation", zone: "periorbital_right", condition: "hyperpigmentation", severity: { ">=": 0.5 } },
    ],
    then: {
      assert: { fact: "imbalance", name: "Kidney Qi Deficiency", system: "Kidney" },
      message: "In Mian Xiang, shadowing beneath both eyes is read as the Kidney reserve running low — the classical language for having been drawing on your own reserves for a while rather than topping them up.",
      recommend: [
        "Mian Xiang puts length of sleep before quality of sleep for this reading, so protecting the hours comes first.",
        "The classical reading is about reserve rather than effort, so it points toward doing less in the evening rather than more.",
        "This is among the commonest readings in the tradition, and the texts regard it as an ordinary season rather than anything remarkable.",
      ],
      sourcesDiffer: "Sources differ on this — most Mian Xiang texts assign the under-eye to the Kidney, but some schools read it as the Heart's reserve instead, which changes the reading from stamina to feeling.",
    },
  },
  {
    id: "TCM-104-LUNG-DRY", category: "reading", salience: 100,
    describe: "Dryness or paleness on the subject's right cheek.",
    all: [{ fact: "observation", zone: "cheek_right", condition: ["xerosis", "pallor"], severity: { ">=": 0.5 } }],
    then: {
      assert: { fact: "imbalance", name: "Lung Dryness", system: "Lung" },
      message: "Classical Chinese face reading assigns the right cheek to the Lung, and reads dryness there as Lung dryness — the tradition's phrase for a system running without quite enough moisture behind it.",
      recommend: [
        "Mian Xiang reads this as environmental more often than internal, so indoor humidity and heating are the first thing it points at.",
        "A plain, heavy moisturiser at night is the modern form of the classical advice to seal moisture in overnight.",
      ],
      sourcesDiffer: "Both Chinese and Western traditions read the cheeks as a register of vitality, but they part on sides — Mian Xiang assigns the right cheek to the Lung specifically, while Lavater (1778) read cheek colour as a single sign and never divided it left from right.",
    },
  },
  {
    id: "TCM-202-DAMP-HEAT", category: "reading", salience: 80,
    describe: "A digestive reading and a reserve reading appearing together.",
    all: [
      { fact: "imbalance", name: "Stomach Heat" },
      { fact: "imbalance", name: "Kidney Qi Deficiency" },
    ],
    then: {
      assert: { fact: "imbalance", name: "Damp-Heat", system: "Spleen-Stomach" },
      message: "In Mian Xiang, a digestive reading and a reserve reading appearing together are not counted as two findings but as one — Damp-Heat, where dampness and heat hold each other in place and neither shifts alone.",
      recommend: [
        "Because Mian Xiang reads these as a single pattern, it addresses them as a pair: regular meal timing and regular sleep timing move together or not at all.",
      ],
      sourcesDiffer: "Sources differ on this — some classical texts regard Damp-Heat as a pattern in its own right, while others describe it as a stage that Stomach Heat passes through on its way somewhere else.",
    },
  },
];
