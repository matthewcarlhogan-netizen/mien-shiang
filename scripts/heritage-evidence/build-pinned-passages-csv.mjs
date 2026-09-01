#!/usr/bin/env node
/*
 * Build PROJECT_OWNED_PINNED_PASSAGES.csv — the machine-readable provenance
 * spine. Takes the 17 rows of the dossier's §2 PINNED_PASSAGES.csv verbatim
 * (their passageChinese has been verified byte-for-byte or as a documented
 * reading-through against the project-owned bytes by acquire-and-verify.mjs),
 * adds a `projectOwnedVerification` column from that run's JSON, and appends the
 * 2 passageIds the dossier's single-codepoint / single-locator searches missed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFencedCsv, normaliseNewlines } from "../lib/heritage-dossier.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dossier = normaliseNewlines(readFileSync(join(ROOT, "MIEN_SHIANG_PINNING_PASS.md"), "utf8"));
const verify = JSON.parse(readFileSync(join(ROOT, "docs/heritage-evidence/acquisition-verify.json"), "utf8"));

const csvBlock = extractFencedCsv(
  dossier,
  "passageId,sourceId,repoUrl,commitSha,fileSha256,filePath,juan,section,pbMarker,textualLayer,passageChinese,translation,retrievedAt",
);
const lines = csvBlock.split("\n");
const header = lines[0];
const bodyRows = lines.slice(1).filter(l => l.trim());

const statusById = Object.fromEntries(verify.passageResults.map(p => [p.passageId, p.status]));

// header + one extra column
const outHeader = header + ",projectOwnedVerification,projectOwnedNote";
const out = [outHeader];

for (const row of bodyRows) {
  // find the passageId (first field, unquoted)
  const id = row.slice(0, row.indexOf(","));
  const st = statusById[id] || "NOT_RUN";
  const note = st === "VERIFIED"
    ? "contiguous byte-for-byte match under the claimed <pb:> marker"
    : st === "VERIFIED_WITH_TRANSCRIPTION_NOTE"
    ? "reading-through: dossier quote flattens Mandoku double-column notes and reads across interlinear glosses; every substantive run present under the marker in order (see RESEARCH_ERRATA.md T)"
    : st;
  out.push(`${row},${st},"${note}"`);
}

// --- 2 project-owned additions ---
const C45 = "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5";
const SHA_45_001 = verify.hashTable.find(h => h.file === "KR3g0045_001.txt").actual;
const SHA_45_003 = verify.hashTable.find(h => h.file === "KR3g0045_003.txt").actual;
const T = "2026-08-29T04:49:24Z";

const q = (s) => `"${s.replace(/"/g, '""')}"`;

out.push([
  "tq-j1-shierdgong", "taiqing-shenjian", "https://github.com/kanripo/KR3g0045", C45, SHA_45_001,
  "KR3g0045_001.txt", "卷一", "成和子統論", "<pb:KR3g0045_WYG_001-17b> to <pb:KR3g0045_WYG_001-18a>", "base-text",
  q("或曰面有十二宫印堂為命宫天倉地庫為財帛宫龍虎額角頭為兄弟宫日月角為父母宫三隂三陽為男女宫懸壁為奴僕宫魚尾為妻妾宫神光年夀為疾厄宫山林邊地為遷移宫正面為官禄宫精神地角福堂為福德宫相貌則總而言也取形之理分三主九曜十二宫之法無以易此"),
  q("One account holds: the face has Twelve Palaces — the seal-hall (印堂) is the Palace of Life; the granaries and treasuries (天倉地庫) the Palace of Wealth; the dragon-and-tiger and the forehead corners the Palace of Siblings; the sun-and-moon horns the Palace of Parents; the three-yin and three-yang the Palace of Children; the hanging wall (懸壁) the Palace of Servants; the fish-tails (魚尾) the Palace of Spouse; the spirit-light and year-longevity the Palace of Adversity; the mountain-forest and border-land the Palace of Travel; the frontal plane (正面) the Palace of Office; the essence-spirit, earth-corner and blessing-hall the Palace of Fortune; the countenance (相貌) is spoken of as the whole. In the principle of reading the form, the method of the Three Masters, the Nine Luminaries and the Twelve Palaces — nothing can improve on this."),
  T, "VERIFIED", q("PROJECT-OWNED ADDITION. The literal string 十二宫 (宫 = U+5BAB) occurs twice in KR3g0045_001; this occurrence heads a full 12-slot enumeration. The dossier §7 grep used 十二宮 (宮 = U+5BAE) and returned zero — a Kanripo-normalisation false negative. Slots: 命/財帛/兄弟/父母/男女/奴僕/妻妾/疾厄/遷移/官禄/福德 (11 named) + 相貌 as concluding summary; NO 田宅宮. Matches heritage-twelve-palaces-taiqing / the twelve-palaces-constituents disagreement in the repo, now byte-pinned."),
].join(","));

out.push([
  "tq-j3-xunzi-explicit", "taiqing-shenjian", "https://github.com/kanripo/KR3g0045", C45, SHA_45_003,
  "KR3g0045_003.txt", "卷三", "心術論", "<pb:KR3g0045_WYG_003-2b>", "base-text",
  q("察其徳而後相其形故徳美而形惡無妨為君子形善而行凶不害為小人荀子曰相形不如相心論心不如論徳此勸人為善也又言其徳為先矣"),
  q("Examine a person's virtue and only then read the form: thus one of fine virtue but ill form may still be a gentleman, and one of fine form but vicious conduct is still a base man. Xunzi says: reading the form is not as good as reading the heart; assessing the heart is not as good as assessing virtue. This exhorts people to do good, and again puts virtue first."),
  T, "VERIFIED", q("PROJECT-OWNED ADDITION and a VARIANT. This is the EXPLICIT 荀子曰 citation, ~20 lines after the unattributed allusion at tq-j3-lunxin-zeshu (003-1b). The Taiqing witness reads 相形不如相心，論心不如論徳 — it does NOT quote 荀子·非相 verbatim (received: 相形不如論心，論心不如擇術). Both clauses differ. The玉管 witness (KR3g0044_002, <pb:KR3g0044_WYG_002-11b>) reads 相形不若相心，論心不若論擇術 — agreeing with Taiqing on 相心 but not on the second clause. Keep SEPARATE from the tq-j3-lunxin-zeshu allusion; do not merge or cross-upgrade."),
].join(","));

writeFileSync(join(ROOT, "docs/heritage-evidence/PROJECT_OWNED_PINNED_PASSAGES.csv"), out.join("\n") + "\n");
console.log(`wrote ${out.length - 1} rows (17 dossier + 2 project-owned additions)`);
