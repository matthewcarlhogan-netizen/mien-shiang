import { test } from "node:test";
import assert from "node:assert/strict";
import { validateHeritageRecord } from "../../src/heritage/validator.js";

test("Validator detects missing constructId", () => {
  const record = {
    canonicalChineseName: "test",
    lineages: {}
  };
  const { valid, errors } = validateHeritageRecord(record);
  assert.strictEqual(valid, false);
  assert.ok(errors.includes("Missing constructId"));
});

test("Validator detects missing lineageId", () => {
  const record = {
    constructId: "test",
    canonicalChineseName: "test",
    lineages: {
      primary: {
        definition: "def",
        source: "src"
      }
    }
  };
  const { valid, errors } = validateHeritageRecord(record);
  assert.strictEqual(valid, false);
  assert.ok(errors.includes("Lineage primary missing lineageId"));
});

test("Validator detects missing availability/safety", () => {
  const record = {
    constructId: "test",
    canonicalChineseName: "test",
    lineages: {
      primary: {
        lineageId: "primary",
        definition: "def",
        source: "src"
      }
    }
  };
  const { valid, errors } = validateHeritageRecord(record);
  assert.strictEqual(valid, false);
  assert.ok(errors.includes("Lineage primary missing availability"));
  assert.ok(errors.includes("Lineage primary missing safetyStatus"));
});

test("Validator accepts valid record", () => {
  const record = {
    constructId: "test",
    canonicalChineseName: "test",
    lineages: {
      primary: {
        lineageId: "primary",
        definition: "def",
        source: "src",
        availability: "available",
        safetyStatus: "safe",
        disagreements: ["scholarly position A"]
      }
    }
  };
  const { valid, errors } = validateHeritageRecord(record);
  assert.strictEqual(valid, true);
  assert.strictEqual(errors.length, 0);
});

test("Validator detects invalid disagreements format", () => {
  const record = {
    constructId: "test",
    canonicalChineseName: "test",
    lineages: {
      primary: {
        lineageId: "primary",
        definition: "def",
        source: "src",
        availability: "available",
        safetyStatus: "safe",
        disagreements: "not-an-array"
      }
    }
  };
  const { valid, errors } = validateHeritageRecord(record);
  assert.strictEqual(valid, false);
  assert.ok(errors.includes("Lineage primary has invalid disagreements format"));
});

test("Validator enforces new constraints", () => {
  const record = {
    constructId: "test",
    canonicalChineseName: "test",
    lineages: {
      bad: {
        lineageId: "bad",
        definition: "def",
        source: "src",
        availability: "unknown",
        safetyStatus: "unknown"
      },
      abstention: {
        lineageId: "abstention",
        definition: "def",
        source: "src",
        availability: "abstention",
        safetyStatus: "safe"
      },
      attested: {
        lineageId: "attested",
        definition: "def",
        source: "",
        availability: "available",
        safetyStatus: "safe",
        attestedCombinations: ["a", "b"]
      }
    }
  };
  const { valid, errors } = validateHeritageRecord(record);
  assert.strictEqual(valid, false);
  assert.ok(errors.find(e => e.includes("invalid availability")));
  assert.ok(errors.find(e => e.includes("invalid safetyStatus")));
  assert.ok(errors.find(e => e.includes("abstention requires abstentionReason")));
  assert.ok(errors.find(e => e.includes("attestedCombinations but missing source")));
});
