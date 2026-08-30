import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HERITAGE_REGISTRY,
  createHeritageRegistry,
} from "../../src/heritage/registry.js";
import { HERITAGE } from "../../src/qise/reflection-corpus.js";
import { composeReading } from "../../src/qise/reflection.js";
import { SOURCE_REGISTRY } from "../../src/reading/provenance.js";

const readState = (overrides = {}) => ({
  ascendant: "chi",
  direction: "up",
  availability: "read",
  magnitudeBand: "slight",
  historyStage: "established",
  trajectory: "steady",
  confidenceBand: "high",
  heritageConstruct: "threeSections",
  sourceLineage: "primary",
  ...overrides,
});

test("registry exposes the canonical constructs and their lineages", () => {
  assert.ok(HERITAGE_REGISTRY.threeSections);
  assert.ok(HERITAGE_REGISTRY.fiveElements);
  assert.ok(HERITAGE_REGISTRY.twelvePalaces);
  assert.ok(HERITAGE_REGISTRY.fiveMountains);
  assert.ok(HERITAGE_REGISTRY.fourRivers);
  assert.ok(HERITAGE_REGISTRY.fiveOfficers);
  assert.ok(HERITAGE_REGISTRY.fourRivers.lineages.primary);
  assert.ok(HERITAGE_REGISTRY.fourRivers.lineages.variant);
  assert.equal(Object.isFrozen(HERITAGE_REGISTRY), true);
  assert.equal(Object.isFrozen(HERITAGE_REGISTRY.threeSections.lineages.primary), true);
});

test("every registry lineage carries provenance and has no placeholder source", () => {
  for (const record of Object.values(HERITAGE_REGISTRY)) {
    for (const lineage of Object.values(record.lineages)) {
      assert.ok(lineage.sourceId, record.constructId);
      assert.ok(lineage.citationStatus, record.constructId);
      assert.ok(lineage.measurementAvailability, record.constructId);
      assert.equal(lineage.prohibitedForUserInference, true);
      assert.doesNotMatch(lineage.source, /pending-/i);
    }
  }
});

test("engine reads only runtime-eligible attributed heritage prose", () => {
  const held = composeReading(readState(), { includeSelfReport: false });
  const heldPart = held.parts.find((part) => part.id === "heritage");
  assert.ok(heldPart, "a held source should render an explicit gap, not a blank layer");
  assert.match(heldPart.text, /research ledger.*not in this reading/i);
  assert.doesNotMatch(heldPart.text, /stand equal.*auspicious/i);
  assert.ok(held.heritageAbstentions.some((entry) =>
    entry.reasonCode === "HERITAGE_RESEARCH_ONLY"));

  const reading = composeReading(readState({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
  }), { includeSelfReport: false });
  const heritagePart = reading.parts.find((part) => part.id === "heritage");
  assert.ok(heritagePart);
  assert.ok(heritagePart.text.includes("Four waterways"));
  assert.equal(reading.heritageAbstentions.length, 0);
});

test("measurement abstention is explicit and never becomes observation prose", () => {
  const reading = composeReading(readState({
    availability: "abstained_confidence",
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
  }), {
    includeSelfReport: false,
  });
  assert.ok(reading.parts.some((part) => part.id === "heritage"));
  assert.equal(reading.parts.some((part) => part.id === "observation"), false);
  assert.equal(reading.parts.some((part) => part.id === "magnitude"), false);
  assert.equal(reading.heritageAbstentions.length, 1);
  assert.deepEqual(reading.heritageAbstentions[0], {
    layer: "reflection",
    terminationState: "abstain",
    reasonCode: "abstained_confidence",
    provenanceId: "heritage-join-abstention",
  });
  assert.match(reading.text, /did not|cannot|incomplete|no reading/i);
});

test("a source lineage marked abstention does not emit its definition", () => {
  const corpus = {
    ...HERITAGE,
    threeSections: {
      ...HERITAGE.threeSections,
      primary: {
        ...HERITAGE.threeSections.primary,
        availability: "abstention",
        abstentionReason: "Source boundary not resolved.",
        terminationState: "abstain",
      },
    },
  };
  const testRegistry = createHeritageRegistry(corpus);
  const reading = composeReading(readState(), {
    includeSelfReport: false,
    registry: testRegistry,
  });
  const heritage = reading.parts.find((part) => part.id === "heritage");
  assert.ok(heritage, "source abstention should remain visible as a deliberate gap");
  assert.doesNotMatch(heritage.text, /eight characters|stand equal|auspicious/i);
  assert.match(heritage.text, /research ledger/i);
  assert.ok(reading.heritageAbstentions.some((entry) =>
    entry.reasonCode === "HERITAGE_SOURCE_ABSTENTION"));
});

test("五行 is related to 五形 but is not accepted as its alias", () => {
  const record = HERITAGE_REGISTRY.fiveElements;
  assert.deepEqual(record.aliases, ["五形人"]);
  assert.equal(record.aliases.includes("五行"), false);
  assert.ok(record.lineages.primary.relatedSystems.some((system) =>
    system.canonicalChineseName === "五行"));
  assert.match(record.lineages.primary.prohibitedInference, /colour|Qi Se/i);
});

test("Claude-reviewed primary records are promoted without promoting research holds", () => {
  assert.equal(HERITAGE_REGISTRY.fiveElements.verificationStatus, "VERIFIED_PRIMARY");
  assert.equal(HERITAGE_REGISTRY.fiveMountains.verificationStatus, "VERIFIED_PRIMARY");
  assert.equal(HERITAGE_REGISTRY.fourRivers.verificationStatus, "VERIFIED_PRIMARY");
  assert.equal(HERITAGE_REGISTRY.fiveOfficers.verificationStatus, "VERIFIED_PRIMARY");
  assert.equal(HERITAGE_REGISTRY.threeSections.verificationStatus, "RECORDED_NOT_VERIFIED");
  assert.equal(HERITAGE_REGISTRY.twelvePalaces.verificationStatus, "RECORDED_NOT_VERIFIED");
  assert.equal(
    HERITAGE_REGISTRY.fourRivers.lineages.variant.evidenceStrength,
    "VERIFIED_SECONDARY",
  );
});

test("parallel source assignments remain distinct machine-readable lineages", () => {
  assert.ok(HERITAGE_REGISTRY.threeSections.lineages["sxqb-mingdu"]);
  assert.ok(HERITAGE_REGISTRY.threeSections.lineages["common-transmitted"]);
  assert.ok(HERITAGE_REGISTRY.twelvePalaces.lineages["taiqing-yuguan"]);
  assert.ok(HERITAGE_REGISTRY.fiveMountains.lineages["taiqing-siku"]);
  assert.ok(HERITAGE_REGISTRY.fiveMountains.lineages["sxqb-chin"]);
  assert.ok(HERITAGE_REGISTRY.fiveMountains.lineages["shenyi-lower-face-zone"]);
  assert.equal(HERITAGE_REGISTRY.fiveOfficers.lineages["philtrum-variant"], undefined);
  // 2026-08-29 project-owned Kanripo reconciliation (matrix EV-08): the
  // philtrum-longevity-office claim (formerly NONE_ATTESTED in
  // unverifiedClaims) is now a witnessed position — 人中=保夀官 — inside the
  // new renlun-xue lineage. unverifiedClaims is correctly empty as a result.
  assert.deepEqual(HERITAGE_REGISTRY.fiveOfficers.lineages.primary.unverifiedClaims, []);
  assert.ok(HERITAGE_REGISTRY.fiveOfficers.lineages["renlun-xue"]);
  assert.ok(HERITAGE_REGISTRY.fiveOfficers.lineages["renlun-xue"].constituents
    .some((member) => member.canonicalChineseName === "保夀官" && member.definition.includes("人中")));
  assert.equal(
    HERITAGE_REGISTRY.twelvePalaces.lineages["taiqing-yuguan"].constituents
      .some((member) => member.canonicalChineseName === "田宅宮"),
    false,
  );
});

test("source corrections keep section and folio evidence independent", () => {
  assert.match(SOURCE_REGISTRY["heritage-five-mountains"].sectionLocator, /Five Mountains.*juan 2/i);
  assert.match(SOURCE_REGISTRY["heritage-four-rivers-primary"].sectionLocator, /Four Rivers.*juan 2/i);
  assert.match(SOURCE_REGISTRY["heritage-five-officers"].sectionLocator, /Five Officers.*juan 2/i);
  assert.match(SOURCE_REGISTRY["heritage-twelve-palaces"].sectionLocator, /十二宮訣.*十二宮絡/);
  // heritage-taiqing-form-qise-interaction (SR-08 in the 2026-08-29 project-owned
  // reconciliation) is untouched by folio pinning — its specific 卷四 predicate was
  // not read this pass — so it still demonstrates a verified section alongside a
  // not-yet-recorded folio, which is what this test is actually about.
  assert.equal(SOURCE_REGISTRY["heritage-taiqing-form-qise-interaction"].citationStatus, "verified");
  assert.equal(SOURCE_REGISTRY["heritage-taiqing-form-qise-interaction"].folioLocator, null);
  assert.equal(SOURCE_REGISTRY["heritage-taiqing-form-qise-interaction"].folioLocatorStatus, "NOT_RECORDED");
  assert.doesNotMatch(SOURCE_REGISTRY["heritage-twelve-palaces"].title, /十二宮相論/);
});

test("project-owned acquisition (2026-08-29): heritage-five-mountains now carries a verified folio locator", () => {
  // Intentional evidence-caused change (matrix SR-01/SR-01b), not a regression:
  // see docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md.
  const source = SOURCE_REGISTRY["heritage-five-mountains"];
  assert.equal(source.folioLocatorStatus, "VERIFIED");
  assert.equal(source.folioLocator, "<pb:KR3g0045_WYG_002_17b>");
  assert.equal(source.repository, "kanripo/KR3g0045");
  assert.equal(source.sha256, "bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9");
});

test("Claude corrections preserve contested attribution and distinct witnesses", () => {
  assert.equal(
    SOURCE_REGISTRY["heritage-three-sections"].citationStatus,
    "attribution-contradicted",
  );
  assert.match(
    SOURCE_REGISTRY["heritage-three-sections"].authorshipNote,
    /contradicts.*predicate/i,
  );
  assert.ok(SOURCE_REGISTRY["heritage-four-rivers-sxqb-shoujuan-xiangshuo"]);
  assert.ok(SOURCE_REGISTRY["heritage-four-rivers-sxqb-juan2"]);
  assert.ok(SOURCE_REGISTRY["heritage-four-rivers-renlun-fengjian"]);
  assert.ok(SOURCE_REGISTRY["heritage-four-rivers-renlun-datong"]);
  assert.equal(
    SOURCE_REGISTRY["heritage-taiqing-shidian-discovery"].sourceAccess,
    "DISCOVERY_ONLY",
  );
});

test("Taiqing is described as a contested attribution, never as Wang Pu authorship", () => {
  const taiqingSources = Object.values(SOURCE_REGISTRY)
    .filter((source) => /Taiqing Shenjian/i.test(source.title));
  assert.ok(taiqingSources.length >= 5);
  for (const source of taiqingSources) {
    assert.equal(source.authorshipStatus, "ATTRIBUTED_AND_CONTESTED");
    assert.match(source.authorshipNote, /Song-era text attributed.*Wang Pu.*rejected/i);
    assert.doesNotMatch(source.title, /by Wang Pu/i);
  }
});

test("heritage-only and research-only lineages cannot enter runtime prose", () => {
  const reading = composeReading(readState({
    heritageConstruct: "fiveMountains",
    sourceLineage: "taiqing-siku",
  }), { includeSelfReport: false });
  const heritage = reading.parts.find((part) => part.id === "heritage");
  assert.ok(heritage, "a held lineage must be explained instead of disappearing");
  assert.match(heritage.text, /research ledger/i);
  assert.equal(reading.text.includes("太清神鑑 Five Mountains assignment"), false);
});
