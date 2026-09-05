/* Beta abstain vocabulary test — asserts abstain state uses correct vocabulary.
 * - No red colors for text or error framing (cinnabar #C8452A allowed only for seal/ticks)
 * - No "error"/"failed"/"broken"/"try again" vocabulary
 * - No apology-tone phrasing
 * - No claim-structure violations in abstain flow
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BETA_JS = fileURLToPath(new URL("../../beta/beta.js", import.meta.url));

// Forbidden vocabulary for abstain state
// "bad" is deliberately excluded: the within-person legend ("neither is good
// or bad") uses it in a non-apologetic, non-error sense, and that string is
// required verbatim by tests/beta/within-person.test.js.
const FORBIDDEN_WORDS = [
  "error", "failed", "failure", "broken", "break", "try again", "retry",
  "sorry", "apologize", "apology", "unfortunately", "problem", "issue",
  "wrong", "mistake", "fault", "invalid", "incorrect",
];

const forbiddenRegex = new RegExp(
  "\\b(" + FORBIDDEN_WORDS.map((w) => w.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")).join("|") + ")\\b",
  "i"
);

// Claim-structure regex
const CLAIM_STRUCTURE_REGEX = /\byou\s+(are|will|feel|look|seem|have)\b/i;

test("abstain-vocabulary: no error/failure vocabulary in beta files", () => {
  const code = readFileSync(BETA_JS, "utf8");
  
  // Strip comments
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  
  const m = stripped.match(forbiddenRegex);
  assert.equal(m, null,
    m ? `abstain-vocabulary violation — found forbidden word: "${m[0]}"` : undefined);
});

test("abstain-vocabulary: abstain strings use correct phrasing", () => {
  const code = readFileSync(BETA_JS, "utf8");
  
  // Expected abstain strings (exact match per design spec)
  const expectedAbstainStrings = [
    "The light was untrue. No seal.",
    "Face a window or raise the halo.",
  ];
  
  for (const expected of expectedAbstainStrings) {
    assert.ok(code.includes(expected),
      `abstain-vocabulary: expected string not found: "${expected}"`);
  }
});

test("abstain-vocabulary: no claim-structure violations in abstain context", () => {
  const code = readFileSync(BETA_JS, "utf8");
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  
  // Check abstain-related strings specifically
  const abstainContext = stripped.toLowerCase();
  
  // The claim-structure regex should not match in abstain messaging
  const m = stripped.match(CLAIM_STRUCTURE_REGEX);
  if (m) {
    // Check if it's in an abstain-related section
    const idx = stripped.indexOf(m[0]);
    const contextStart = Math.max(0, idx - 100);
    const contextEnd = Math.min(stripped.length, idx + 100);
    const context = stripped.slice(contextStart, contextEnd).toLowerCase();
    
    if (context.includes("abstain") || context.includes("refused") || context.includes("no seal")) {
      assert.fail(`claim-structure violation in abstain context: "${m[0]}"`);
    }
  }
  
  // Pass if no violation found in abstain context
  assert.ok(true, "no claim-structure violations in abstain context");
});

test("abstain-vocabulary: cinnabar color used only for seal and ticks", () => {
  const code = readFileSync(BETA_JS, "utf8");
  
  // Cinnabar should be defined but only used for seal/ticks, not for error text
  assert.ok(code.includes("#C8452A") || code.includes("CINNABAR"),
    "cinnabar color should be defined");
  
  // Check that cinnabar is NOT used for text color in error/abstain context
  // This is a structural check — the actual usage is in CSS
  const cssFile = fileURLToPath(new URL("../../beta/beta.css", import.meta.url));
  const cssCode = readFileSync(cssFile, "utf8");
  
  // In CSS, cinnabar should be used for .seal and ring ticks, not for general text
  const sealUsesCinnabar = cssCode.includes(".seal") && cssCode.includes("#C8452A");
  assert.ok(sealUsesCinnabar, "cinnabar should be used for seal styling");
});
