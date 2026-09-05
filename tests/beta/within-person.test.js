/* Beta within-person test — asserts ring and ledger encode only within-person deltas.
 * - No population strings
 * - No absolute colour values presented as population comparisons
 * - No "you are X" phrasing
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BETA_JS = fileURLToPath(new URL("../../beta/beta.js", import.meta.url));

// Population comparison patterns that should NOT appear
const POPULATION_PATTERNS = [
  /population/i,
  /average.*person/i,
  /compared.*others/i,
  /percentile/i,
  /norm/i,
  /normal.*range/i,
  /typical/i,
  /other.*users/i,
  /people.*your/i,
  /better.*than/i,
  /worse.*than/i,
];

// Claim-structure regex for "you are" assertions
const YOU_ARE_REGEX = /\byou\s+are\s+\w+/i;

test("within-person: no population comparison strings in beta files", () => {
  const code = readFileSync(BETA_JS, "utf8");
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  
  const offenders = [];
  for (const pattern of POPULATION_PATTERNS) {
    const m = stripped.match(pattern);
    if (m) {
      offenders.push(`Pattern ${pattern}: "${m[0]}"`);
    }
  }
  
  assert.deepEqual(offenders, [],
    "within-person violation — found population comparison language:\n  " +
    offenders.join("\n  "));
});

test("within-person: ledger encodes relative deltas only", () => {
  const code = readFileSync(BETA_JS, "utf8");
  
  // The ledger should use within-person delta encoding (lerp between cool/warm)
  // Check for the presence of delta-based coloring logic
  assert.ok(code.includes("deltas") || code.includes("baseline"),
    "within-person: ledger should reference baseline/deltas");
  
  // Verify no absolute color values are presented as population metrics
  const absValuePatterns = [
    /absolute.*value/i,
    /population.*average/i,
    /reference.*population/i,
  ];
  
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  
  for (const pattern of absValuePatterns) {
    const m = stripped.match(pattern);
    assert.equal(m, null,
      `within-person: should not present absolute values as population metrics: "${m[0]}"`);
  }
});

test("within-person: no 'you are' state assertions", () => {
  const code = readFileSync(BETA_JS, "utf8");
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  
  const m = stripped.match(YOU_ARE_REGEX);
  if (m) {
    // Allow imperative forms like "you are invited to" but not state assertions
    const contextStart = stripped.indexOf(m[0]);
    const contextEnd = Math.min(stripped.length, contextStart + 50);
    const context = stripped.slice(contextStart, contextEnd).toLowerCase();
    
    // Check if it's an allowed imperative vs a state assertion
    const allowedImperatives = ["invited", "allowed", "free", "welcome"];
    const isAllowed = allowedImperatives.some((word) => context.includes(word));
    
    if (!isAllowed) {
      assert.fail(`within-person: 'you are' state assertion found: "${m[0]}"`);
    }
  }
  
  assert.ok(true, "no prohibited 'you are' state assertions");
});

test("within-person: legend uses correct within-person phrasing", () => {
  const code = readFileSync(BETA_JS, "utf8");
  
  // Expected legend string per design spec
  const expectedLegend = "cooler ↔ warmer than your baseline — neither is good or bad";
  
  assert.ok(code.includes(expectedLegend),
    `within-person: expected legend string not found: "${expectedLegend}"`);
  
  // Verify the legend explicitly references "your baseline" (within-person)
  // and NOT population terms
  assert.ok(code.includes("baseline"),
    "within-person: should reference baseline for comparison");
});
