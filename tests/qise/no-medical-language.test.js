/*
 * PHASE 10, gate 2 — no medical language in any shipped string.
 *
 * ── WHY THIS IS THE GATE THAT KEEPS 14B AVAILABLE ──────────────────────────
 * Under the Therapeutic Goods (Excluded Goods) Determination 2018, Schedule 1
 * item 14B covers software intended for general consumer use to promote or
 * facilitate general health or wellness. It is available to us only while the
 * product provides no information about a serious disease, condition, ailment
 * or defect, is not used for diagnosis or prognosis, and makes no treatment
 * recommendation — and EVERY function of a multi-function product must
 * independently meet the criteria. One non-conforming feature voids the
 * exclusion for the whole product, including the parts that were careful.
 *
 * So this is not a tone check. Treat any request to add organ mapping,
 * symptom language or a health "score" as a request to become an
 * ARTG-registered medical device, because that is what it is.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

import { extractJsProse, tokeniseStringLiterals, stripComments } from "../../scripts/copy-scan.js";
import { CORE, BAND, COURSE, ATTRIBUTION } from "../../src/qise/passages.js";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));
const TREES = [join(SRC, "qise"), join(SRC, "ui", "qise")];

const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
}) : []);

const files = TREES.flatMap(walk).filter((f) => f.endsWith(".js"));
const rel = (f) => relative(SRC, f).replace(/\\/g, "/");

/*
 * Stems, not whole words. "diagnos" and "deficien" are only meaningful as
 * prefixes, and matching whole words would let "diagnosis" and "deficiency"
 * straight through the guard written to stop them. Anchored at the left with a
 * word boundary so an ordinary word that merely contains one — "prediction" is
 * caught, "unpredictable" is not the concern — does not produce noise.
 */
export const BANNED_STEMS = [
  "diagnos", "disease", "symptom", "treat", "cure", "healthy", "unhealthy",
  "deficien", "organ", "liver", "kidney", "spleen", "lung", "heart",
  "predict", "forecast", "illness", "medical", "patient", "therapy",
];

const BANNED = new RegExp(String.raw`\b(${BANNED_STEMS.join("|")})`, "i");
const SECOND_PERSON_FUTURE = /\byou will\b|\byou'll\b/i;

/** Every string literal that could reach a screen, from both trees. */
function shippedStrings() {
  const out = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    // Prose for the readable-sentence check, and ALL literals for the banned
    // stems: a two-word label is still shipped text, and isProse would skip it.
    for (const s of tokeniseStringLiterals(text)) {
      if (s.trim().length >= 3) out.push({ s, file: rel(f) });
    }
    for (const s of extractJsProse(text)) out.push({ s, file: rel(f) });
  }
  return out;
}

const ALL = shippedStrings();

test("the scanner sees the strings it is supposed to be checking", () => {
  assert.ok(ALL.length > 150, `only ${ALL.length} strings collected`);
  assert.ok(ALL.some((x) => x.s.includes("Hold still.")), "gates.js copy was not scanned");
  assert.ok(ALL.some((x) => x.s.includes(ATTRIBUTION)), "the passage attribution was not scanned");
  assert.ok(ALL.some((x) => x.file === "ui/qise/screens.js"), "the view layer was not scanned");
});

test("no shipped string carries medical language", () => {
  const offenders = [];
  for (const { s, file } of ALL) {
    const m = s.match(BANNED);
    if (m) offenders.push(`${file}: "${m[0]}" in ${JSON.stringify(s.slice(0, 90))}`);
  }
  assert.deepEqual(offenders, [],
    "item 14B is unavailable to a product that says any of this:\n  " + offenders.join("\n  "));
});

test("EVERY passage template is scanned, not the corpus as a whole", () => {
  // The brief asks for every template specifically. Scanning the rendered
  // output would miss a variant the seeded picker happens not to choose.
  const templates = [
    ...Object.values(CORE).flat(),
    ...Object.values(BAND).flat(),
    ...Object.values(COURSE).flat(),
    ATTRIBUTION,
  ];
  assert.ok(templates.length >= 80, `only ${templates.length} templates`);

  const offenders = [];
  for (const t of templates) {
    const m = t.match(BANNED);
    if (m) offenders.push(`"${m[0]}" in ${JSON.stringify(t.slice(0, 90))}`);
    if (SECOND_PERSON_FUTURE.test(t)) offenders.push(`second-person future in ${JSON.stringify(t.slice(0, 90))}`);
  }
  assert.deepEqual(offenders, []);
});

test("nothing anywhere says `you will`", () => {
  const offenders = ALL.filter((x) => SECOND_PERSON_FUTURE.test(x.s))
    .map((x) => `${x.file}: ${JSON.stringify(x.s.slice(0, 90))}`);
  assert.deepEqual(offenders, [],
    "a prediction about the reader is a claim no measurement here supports:\n  " + offenders.join("\n  "));
});

test("the guard fires on each banned stem, including its inflections", () => {
  // Paired positive control, per stem. A stem list is exactly the kind of
  // thing that quietly stops matching after a refactor of the regex.
  const samples = {
    diagnos: "This does not diagnose anything", disease: "a disease of the skin",
    symptom: "your symptoms suggest", treat: "how to treat it", cure: "a cure for it",
    healthy: "a healthy glow", unhealthy: "an unhealthy pallor",
    deficien: "a deficiency of something", organ: "the organ it maps to",
    liver: "the liver reading", kidney: "the kidney zone", spleen: "the spleen area",
    lung: "the lung region", heart: "the heart position", predict: "we predict tomorrow",
    forecast: "a forecast for the week", illness: "signs of illness",
    medical: "medical advice", patient: "for the patient", therapy: "a therapy plan",
  };
  for (const [stem, sample] of Object.entries(samples)) {
    assert.ok(BANNED_STEMS.includes(stem), `${stem} fell off the list`);
    assert.match(sample, BANNED, `the guard misses "${stem}" in: ${sample}`);
  }
  assert.match("You will feel better", SECOND_PERSON_FUTURE);
  assert.match("You'll see a change", SECOND_PERSON_FUTURE);

  // And it does not fire on the vocabulary the feature legitimately needs.
  for (const ok of ["Look straight at the camera.", "moistened greyish jade, not indigo",
    "Across 7 readings you tagged 'poor sleep', your lustre sat below your usual range 5 times."]) {
    assert.doesNotMatch(ok, BANNED, ok);
  }
});

test("no organ correspondence exists to be rendered", () => {
  // Apple 1.1.6: an "entertainment purposes only" disclaimer does not cure a
  // UI that simulates medical diagnostics. The map stays cut, and "stays cut"
  // means there is no data STRUCTURE holding one.
  //
  // Comments are stripped first. Scanning raw source makes the guard trip on
  // the comment explaining why the thing it forbids is absent — CLAUDE.md item
  // 22, where a scanner reported confident findings on its own prose. The
  // patterns are identifier-shaped for the same reason: the bare word is not
  // the defect, a binding holding the mapping is.
  const STRUCTURAL = [
    /\b\w*organ\w*\s*[:=]/i,
    /\bcorrespondences?\s*[:=]/i,
    /\b(ZANG|FU_ORGAN|ORGAN_MAP|ORGAN_ZONES)\b/,
  ];
  const offenders = [];
  for (const f of files) {
    const code = stripComments(readFileSync(f, "utf8"));
    for (const p of STRUCTURAL) {
      const m = code.match(p);
      if (m) offenders.push(`${rel(f)}: ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, []);

  // Paired positive control: the guard must catch one if it appeared.
  assert.ok(STRUCTURAL.some((p) => p.test('const ORGAN_MAP = { tian: "lung" };')));
  assert.ok(STRUCTURAL.some((p) => p.test("export const correspondences = {")));
});
