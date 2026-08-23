import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractHtmlCopy, tokeniseStringLiterals,
} from "../scripts/copy-scan.js";
import { renderReading, renderSummary } from "../src/readingview.js";
import { buildShareModel } from "../src/sharecard.js";
import { integratedReadingModel } from "../src/ui/qise/screens.js";
import { shareCardModel } from "../src/ui/qise/share.js";
import { enumerateReachableStates } from "../src/qise/reading-state.js";
import { composeReading, heritageMaterialFor } from "../src/qise/reflection.js";
import { readingTiers } from "../src/qise/reading-tiers.js";
import { HERITAGE_REGISTRY } from "../src/heritage/registry.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const hasHan = (value) => [...String(value ?? "")].some((character) => {
  const code = character.codePointAt(0);
  return (code >= 0x3400 && code <= 0x4dbf)
    || (code >= 0x4e00 && code <= 0x9fff)
    || (code >= 0xf900 && code <= 0xfaff);
});

const assertEnglishOnly = (value, label) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.equal(hasHan(text), false, `${label} exposed a Chinese character: ${text}`);
};

function filesBelow(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(target) : [target];
  });
}

const legacyReading = () => ({
  qiSe: {
    available: true,
    glowIndex: 50,
    reading: "In Mian Xiang, qi se describes the complexion of a day.",
    basisComplete: true,
    signalsUsed: ["warmth", "luminosity", "evenness"],
    signalsMissing: [],
    sourcesDiffer: "Sources differ on the language used for qi se.",
  },
  fiveElements: {
    available: true,
    element: "earth",
    name: "Earth",
    hanzi: "土",
    shape: "square",
    alternates: [{ name: "Metal", hanzi: "金" }],
    residualShape: false,
    reading: "In Mian Xiang, this geometry is placed beside the Earth form.",
    sourcesDiffer: "Sources differ on modern shape correspondences.",
  },
  threeCourts: {
    available: true,
    balanced: false,
    dominant: "lower",
    court: { name: "Lower Section", hanzi: "下停" },
    fractions: { upper: 0.3, middle: 0.32, lower: 0.38 },
    measurementObservation: "The Lower Section is the largest section.",
    measurementCaveat: "The upper section begins at the top of the face oval in this measurement.",
    sourcesDiffer: "Sources differ on how the face is divided into three sections.",
  },
  twelvePalaces: {
    measuredCount: 1,
    supportedCount: 1,
    totalCount: 12,
    heritageStatus: "WITHHELD_PENDING_SOURCE_REVIEW",
    sourceReviewNote: "Heritage interpretation withheld pending source review.",
    sourcesDiffer: "Sources differ on palace names and placement.",
    palaces: [{
      key: "life",
      name: "Life Palace",
      hanzi: "命宮",
      location: "between the brows",
      measured: true,
      supported: true,
      reading: null,
      heritageStatus: "WITHHELD_PENDING_SOURCE_REVIEW",
      sourceReviewNote: "Heritage interpretation withheld pending source review.",
    }],
  },
});

const legacyQiSeReading = () => {
  const integrated = legacyReading();
  return {
    timestampIso: "2026-08-23T02:30:00.000Z",
    confidence: 0.9,
    compass: {
      ascendant: "chi", magnitude: 2, band: "clear", components: { chi: 2 },
    },
    composition: {
      basis: "capture", lead: "chi", support: "huang",
      segments: { chi: 40, huang: 25, qing: 15, bai: 12, hei: 8 },
    },
    integrated: {
      fiveElements: integrated.fiveElements,
      threeCourts: integrated.threeCourts,
      twelvePalaces: integrated.twelvePalaces,
      harmony: null,
      provenanceIds: {},
    },
  };
};

test("reader-facing source literals contain no Chinese characters", () => {
  const failures = [];
  for (const file of filesBelow(SRC)) {
    const relative = path.relative(SRC, file).split(path.sep).join("/");
    if (relative.startsWith("heritage/") || relative === "reading/provenance.js") continue;
    const source = fs.readFileSync(file, "utf8");
    const strings = file.endsWith(".html")
      ? Object.values(extractHtmlCopy(source)).flat()
      : file.endsWith(".js") ? tokeniseStringLiterals(source) : [];
    for (const string of strings) {
      if (hasHan(string)) failures.push(`${relative}: ${JSON.stringify(string)}`);
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});

test("legacy Chinese fields cannot leak through reading, summary, or share views", () => {
  const reading = legacyReading();
  assertEnglishOnly(renderReading(reading), "detailed reading");
  assertEnglishOnly(renderSummary(reading), "summary");
  assertEnglishOnly(buildShareModel(reading, "Entertainment only."), "share model");

  const qiSeReading = legacyQiSeReading();
  assertEnglishOnly(integratedReadingModel(qiSeReading), "integrated screen model");
  assertEnglishOnly(shareCardModel([qiSeReading], "today"), "Qi Se share model");
});

test("every reachable Reflection Engine output and attribution is English-only", () => {
  for (const state of enumerateReachableStates()) {
    const composed = composeReading(state, { includeSelfReport: false });
    assertEnglishOnly(composed.text, composed.stateKey);
    assertEnglishOnly(heritageMaterialFor(state).attribution, `${composed.stateKey} attribution`);
    assertEnglishOnly(readingTiers({ state, composed }).tier2, `${composed.stateKey} tier 2`);
  }
});

test("runtime heritage prose has translation provenance and English display copy", () => {
  for (const record of Object.values(HERITAGE_REGISTRY)) {
    for (const lineage of Object.values(record.lineages)) {
      if (lineage.runtimeStatus !== "RUNTIME_PROSE") continue;
      assert.notEqual(lineage.translationProvenance, "NOT_TRANSLATED_HERITAGE_ONLY");
      assert.ok(lineage.translationAgentId, `${record.constructId} has no translation agent`);
      assertEnglishOnly({
        definition: lineage.definition,
        note: lineage.note,
        source: lineage.source,
      }, `${record.constructId} runtime lineage`);
    }
  }
});
