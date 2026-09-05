/* Beta halo theme test — asserts halo flash luminance is independent of body theme.
 * The capture sequence MUST override theme to halo-white regardless of dark tracker UI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const BETA_JS = fileURLToPath(new URL("../../beta/beta.js", import.meta.url));

test("halo-theme: beta.js does not hardcode theme-dependent halo values", () => {
  const code = readFileSync(BETA_JS, "utf8");
  
  // The halo luminance should NOT be tied to theme variables
  // Check that there's no direct reference to theme colors for halo/flash
  const themeDependentPatterns = [
    /halo.*theme/i,
    /theme.*halo/i,
    /flash.*color/i,
    /luminance.*theme/i,
  ];
  
  const offenders = [];
  for (const pattern of themeDependentPatterns) {
    const m = code.match(pattern);
    if (m) {
      offenders.push(`Pattern ${pattern}: "${m[0]}"`);
    }
  }
  
  // This is a structural check — the actual halo override happens in exposure-halo.js
  // which is imported from src/ui/qise/. The beta UI just triggers capture.
  // We verify here that beta.js doesn't introduce theme-dependent halo logic.
  assert.deepEqual(offenders, [],
    "halo-theme violation — halo luminance should be theme-independent:\n  " +
    offenders.join("\n  "));
});

test("halo-theme: beta.css has no theme-dependent halo styles", () => {
  const BETA_CSS = fileURLToPath(new URL("../../beta/beta.css", import.meta.url));
  const code = readFileSync(BETA_CSS, "utf8");
  
  // Check for halo-related styles that might be theme-dependent
  const haloThemePattern = /halo.*var\(--.*theme/i;
  const m = code.match(haloThemePattern);
  
  assert.equal(m, null,
    "halo-theme violation — CSS should not tie halo to theme variables");
});
