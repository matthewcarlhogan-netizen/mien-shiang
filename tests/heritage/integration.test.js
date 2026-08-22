import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HERITAGE_REGISTRY,
  createHeritageRegistry,
} from "../../src/heritage/registry.js";
import { HERITAGE } from "../../src/qise/reflection-corpus.js";
import { composeReading } from "../../src/qise/reflection.js";

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
      assert.equal(lineage.prohibitedForUserInference, undefined);
      assert.doesNotMatch(lineage.source, /pending-/i);
    }
  }
});

test("engine reads attributed heritage prose from the canonical registry", () => {
  const reading = composeReading(readState(), { includeSelfReport: false });
  const heritagePart = reading.parts.find((part) => part.id === "heritage");
  assert.ok(heritagePart);
  assert.ok(heritagePart.text.includes("divided into three sections"));
  assert.equal(reading.heritageAbstentions.length, 0);
});

test("measurement abstention is explicit and never becomes observation prose", () => {
  const reading = composeReading(readState({ availability: "abstained_confidence" }), {
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
  assert.equal(reading.parts.some((part) => part.id === "heritage"), false);
});
