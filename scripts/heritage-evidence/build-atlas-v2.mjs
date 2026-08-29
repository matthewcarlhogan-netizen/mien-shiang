#!/usr/bin/env node
/*
 * Build CORRECTED_RELATIONSHIP_ATLAS_V2.csv from the dossier's §4
 * CORRECTED_RELATIONSHIP_ATLAS.csv (38 rows), applying the RESEARCH_ERRATA.md
 * corrections and adding a mechanical `passageIds` join to
 * PROJECT_OWNED_PINNED_PASSAGES.csv. Nothing here interprets Chinese; the
 * passageId map below is an explicit lookup keyed on relationshipId.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dossier = readFileSync(join(ROOT, "MIEN_SHIANG_PINNING_PASS.md"), "utf8");

const block = dossier.match(/```csv\n(relationshipId,family,relationshipClass[\s\S]*?)\n```/)[1];
const lines = block.split("\n").filter(l => l.trim());
const header = lines[0].split(",");
function parseLine(line) {
  const out = []; let f = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(f); f = ""; }
    else f += c;
  }
  out.push(f);
  return out;
}
const rows = lines.slice(1).map(parseLine).map(cells => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])));

// --- mechanical passageId join, keyed on relationshipId (documented in ATLAS_V2.md) ---
const PASSAGE_IDS = {
  "five-mountains-membership-yuebo": "yb-j1-heyue",
  "five-mountains-membership-taiqing": "tq-j2-wuyue",
  "five-mountains-membership-renlun-xue": "rl-j1-wuyue",
  "five-mountains-directional-labels-yuebo": "yb-j2-wuyue-similes",
  "five-mountains-mutual-facing-taiqing": "tq-j2-wuyue",
  "five-mountains-mutual-facing-yuebo": "yb-j1-heyue",
  "five-mountains-mutual-support-cosmological-taiqing": "tq-j2-wuyue",
  "five-mountains-fullness-renlun-xue": "rl-j1-wuyue",
  "four-rivers-membership-yuebo": "yb-j1-heyue",
  "four-rivers-membership-taiqing": "tq-j2-sidu",
  "four-rivers-membership-renlun-xue": "rl-j1-sidu",
  "four-rivers-membership-mayi": "",                       // unpinned dissent, no witness
  "four-rivers-mutual-facing-taiqing": "tq-j2-sidu",
  "four-rivers-answer-to-shen-taiqing": "tq-j2-sidu",
  "mountains-rivers-joint-eval-yuebo": "yb-j1-heyue",
  "mountains-rivers-correspondence-taiqing": "tq-j1-miaojue-xiangying",
  "mountains-rivers-contrast-yuebo": "yb-j1-heyue",
  "five-officers-membership-taiqing": "tq-j2-wuguan",
  "five-officers-membership-renlun-xue": "rl-j1-wuguan",
  "five-officers-one-official-ten-years-taiqing": "tq-j2-wuguan",
  "five-officers-xunzi-gloss-renlun": "rl-j1-wuguan",
  "facial-three-sections-boundaries-taiqing": "tq-j5-mianbu-santing",
  "facial-three-sections-sancai-taiqing": "tq-j5-mianbu-santing",
  "facial-three-sections-predicates-taiqing": "tq-j5-mianbu-santing",
  "facial-three-sections-proportion-taiqing": "tq-j5-mianbu-santing",
  "body-three-sections-ranked-taiqing": "tq-j6-shen-santing",
  "body-three-sections-proportion-taiqing": "tq-j6-shen-santing",
  "three-sections-proportion-shuoge-taiqing": "tq-j1-shuoge-xiangcheng",
  "three-sections-equality-yuguan": "yg-j3-santing-pingdeng",
  "five-forms-like-with-like-yuguan": "yg-j1-wuxingxing",
  "five-forms-tolerance-yuguan": "yg-j1-wuxingxing",
  "five-forms-verse-shenxiang": "",                        // unpinned, no witness
  "renlunfengjian-agrees-mountains": "tq-j2-wuyue",
  "renlunfengjian-agrees-rivers": "tq-j2-sidu",
  "renlunfengjian-variant-witness-taiqing": "tq-j1-shuoge-xiangcheng|tq-j1-sidu-cosmological",  // + 14 further 太清 卷一 notes not individually pinned
  "mountains-provinces-colour-yuebo": "yb-j2-jiuzhou-colour",
  "xunzi-allusion-taiqing": "tq-j3-lunxin-zeshu",
  "xunzi-antiphysiognomy": "",                             // received 非相 text, not retrieved this pass
};

// --- errata corrections ---
function correct(r) {
  const id = r.relationshipId;
  r.passageIds = PASSAGE_IDS[id] ?? "";
  // rename the field that must not be copied into the runtime contract
  r.historicalRuntimeCeiling = r.runtimePotential;
  delete r.runtimePotential;

  if (id === "renlunfengjian-variant-witness-taiqing") {          // E-9
    r.relationshipClass = "SOURCE_CRITICISM_AGGREGATE";
    r.evidenceStrength = "VERIFIED_SECONDARY";
    r.folio = "KR3g0045_WYG_001-1a … 001-6a (16 separate interlinear notes; 2 pinned as passageIds, 14 not individually located)";
    r.notes = "E-9: was one VERIFIED_PRIMARY row with an ellipsis-composite quote over a 6-folio range. Downgraded to a source-criticism aggregate about the 太清 卷一 apparatus. Each individual note is verifiable; the composite is an editorial construction. Not a single located relation.";
  }
  if (id === "mountains-provinces-colour-yuebo") {               // E-9
    r.section = "九州 (sub-section at 002-10b; the 五嶽…所管屬者 heading governs the preceding similes passage)";
    r.notes = "E-9: section relabelled 九州. " + r.notes;
  }
  if (id === "five-mountains-membership-yuebo") {                 // §3-A3 (already in dossier notes) — flag the 3-term split
    r.disagreementId = "five-mountains-lower-face-term";
  }
  return r;
}
const corrected = rows.map(correct);

// --- E-1 / E-2 additions ---
const outHeader = [...header.filter(h => h !== "runtimePotential"), "historicalRuntimeCeiling", "passageIds"];
const q = (s) => /[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s);
const emit = (r) => outHeader.map(h => q(r[h] ?? "")).join(",");

const twelvePalaces = {
  relationshipId: "twelve-palaces-membership-taiqing", family: "twelvePalaces", relationshipClass: "CONSTITUENT_MEMBERSHIP",
  fromParticipant: "twelvePalaces", toParticipant: "eleven-named-palaces-plus-xiangmao", direction: "none", condition: "none",
  historicalClaim: "the face has Twelve Palaces: 命/財帛/兄弟/父母/男女/奴僕/妻妾/疾厄/遷移/官禄/福德 (11 named) + 相貌 as concluding summary; NO 田宅宮",
  sourceId: "heritage-twelve-palaces-taiqing", lineageId: "taiqing-yuguan",
  sourcePassageChinese: "或曰面有十二宫印堂為命宫天倉地庫為財帛宫龍虎額角頭為兄弟宫日月角為父母宫三隂三陽為男女宫懸壁為奴僕宫魚尾為妻妾宫神光年夀為疾厄宫山林邊地為遷移宫正面為官禄宫精神地角福堂為福德宫相貌則總而言也",
  translation: "One account holds the face has Twelve Palaces: seal-hall=Life, granaries/treasuries=Wealth, dragon-tiger/forehead-corners=Siblings, sun-moon horns=Parents, three-yin/three-yang=Children, hanging-wall=Servants, fish-tails=Spouse, spirit-light/year-longevity=Adversity, mountain-forest/border-land=Travel, frontal-plane=Office, essence-spirit/earth-corner/blessing-hall=Fortune; countenance is the whole",
  juan: "卷一", section: "成和子統論", folio: "KR3g0045_WYG_001-17b",
  sectionLocatorStatus: "VERIFIED", folioLocatorStatus: "VERIFIED", citationStatus: "PINNED_COMMIT",
  evidenceStrength: "VERIFIED_PRIMARY", textualLayer: "base-text", disagreementId: "twelve-palaces-constituents",
  prohibitedForUserInference: "true", historicalRuntimeCeiling: "PRODUCT_DECISION_REQUIRED",
  passageIds: "tq-j1-shierdgong",
  notes: "E-1: refutes the dossier's 十二宮=0. The system IS byte-pinned in the Siku corpus (太清 卷一). Distinct from the received-Mayi/神相全編 mapping (田宅宮, 財帛宮=nose), which stays unpinned/SOURCE_REQUIRED. 11 named palaces + 相貌; fortune-typed.",
};
const xunziExplicit = {
  relationshipId: "xunzi-explicit-citation-taiqing", family: "negativeCanonical", relationshipClass: "ATTRIBUTED_VARIANT",
  fromParticipant: "taiqing-shenjian", toParticipant: "xunzi", direction: "directed", condition: "none",
  historicalClaim: "太清 卷三 attributes to 荀子 a maxim ranking heart above form and virtue above heart — but does NOT quote 荀子·非相 verbatim",
  sourceId: "xunzi-feixiang", lineageId: "taiqing-juan3-citation",
  sourcePassageChinese: "荀子曰相形不如相心論心不如論徳",
  translation: "Xunzi says: reading the form is not as good as reading the heart; assessing the heart is not as good as assessing virtue",
  juan: "卷三", section: "心術論", folio: "KR3g0045_WYG_003-2b",
  sectionLocatorStatus: "VERIFIED", folioLocatorStatus: "VERIFIED", citationStatus: "PINNED_COMMIT",
  evidenceStrength: "VERIFIED_PRIMARY", textualLayer: "base-text", disagreementId: "",
  prohibitedForUserInference: "false", historicalRuntimeCeiling: "ELIGIBLE",
  passageIds: "tq-j3-xunzi-explicit",
  notes: "E-2: the EXPLICIT 荀子曰 citation, separate object from the tq-j3-lunxin-zeshu allusion (003-1b) — do NOT cross-upgrade. VARIANT: 太清 reads 相心+論徳; 玉管 卷中 reads 相心+論擇術; received 非相 reads 論心+擇術. The manuals adapt Xunzi, they do not quote him.",
};

const all = [outHeader.join(","), ...corrected.map(emit), emit(twelvePalaces), emit(xunziExplicit)];
writeFileSync(join(ROOT, "docs/heritage-evidence/CORRECTED_RELATIONSHIP_ATLAS_V2.csv"), all.join("\n") + "\n");
console.log(`wrote ${corrected.length} corrected + 2 new = ${corrected.length + 2} rows`);
// recompute arithmetic for the .md
const final = [...corrected, twelvePalaces, xunziExplicit];
const n = (f) => final.filter(f).length;
console.log("rows:", final.length);
console.log("VERIFIED_PRIMARY:", n(r => r.evidenceStrength === "VERIFIED_PRIMARY"));
console.log("VERIFIED_SECONDARY:", n(r => r.evidenceStrength === "VERIFIED_SECONDARY"));
console.log("RECORDED_NOT_VERIFIED:", n(r => r.evidenceStrength === "RECORDED_NOT_VERIFIED"));
console.log("prohibited=true:", n(r => r.prohibitedForUserInference === "true"));
console.log("ceiling ELIGIBLE:", n(r => r.historicalRuntimeCeiling === "ELIGIBLE"));
console.log("ceiling PRODUCT_DECISION_REQUIRED:", n(r => r.historicalRuntimeCeiling === "PRODUCT_DECISION_REQUIRED"));
console.log("ceiling HISTORICAL_EVIDENCE_ONLY:", n(r => r.historicalRuntimeCeiling === "HISTORICAL_EVIDENCE_ONLY"));
console.log("rows with a passageId join:", n(r => r.passageIds && r.passageIds.length));
console.log("VERIFIED_PRIMARY rows WITHOUT a passageId:", final.filter(r => r.evidenceStrength === "VERIFIED_PRIMARY" && !r.passageIds).map(r => r.relationshipId).join(", ") || "none");
