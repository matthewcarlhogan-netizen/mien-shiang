import { test } from "node:test";
import assert from "node:assert/strict";
import { HERITAGE_REGISTRY } from "../../src/heritage/registry.js";
import { composeReading } from "../../src/qise/reflection.js";

test("Registry loads validated canonical records", () => {
  assert.ok(HERITAGE_REGISTRY.threeSections, "threeSections should be in registry");
  assert.strictEqual(typeof HERITAGE_REGISTRY.threeSections.lineages.primary, "object");
});

test("Engine uses registry for heritage layer", () => {
  const state = {
    ascendant: "chi",
    direction: "up",
    availability: "read",
    magnitudeBand: "slight",
    historyStage: "established",
    trajectory: "steady",
    confidenceBand: "high",
    heritageConstruct: "threeSections",
    sourceLineage: "primary",
  };
  
  const reading = composeReading(state, { includeSelfReport: false });
  const heritagePart = reading.parts.find(p => p.id === "heritage");
  assert.ok(heritagePart, "heritage part should be present");
  assert.ok(heritagePart.text.includes("divided into three sections"), "Text should come from registry");
});

test("Abstention from heritage content", () => {
    // Inject an abstention lineage
    HERITAGE_REGISTRY.testAbstention = {
        constructId: "testAbstention",
        canonicalChineseName: "测试",
        lineages: {
            primary: {
                lineageId: "primary",
                definition: "should not be seen",
                source: "src",
                availability: "abstention",
                abstentionReason: "test reason",
                safetyStatus: "safe"
            }
        }
    };
    const state = {
        heritageConstruct: "testAbstention",
        sourceLineage: "primary",
      };
      
      const reading = composeReading(state, { includeSelfReport: false });
      const heritagePart = reading.parts.find(p => p.id === "heritage");
      assert.strictEqual(heritagePart, undefined, "Heritage part should be abstained/undefined");
});
