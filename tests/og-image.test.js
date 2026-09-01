/* Social preview contract: the deployed pages must advertise one real,
 * deterministic image, not rely on a browser-rendered canvas or a missing URL.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative) => readFileSync(`${root}/${relative}`, "utf8");
const index = read("src/index.html");
const qise = read("src/qise.html");

function pngDimensions(relative) {
  const bytes = readFileSync(`${root}/${relative}`);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10],
    "OG asset must be a PNG");
  assert.equal(bytes.toString("ascii", 12, 16), "IHDR",
    "OG PNG must contain an IHDR chunk");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function assertSocialMetadata(html, pageName) {
  assert.match(html, /property="og:image" content="https:\/\/matthewcarlhogan-netizen\.github\.io\/mien-shiang\/og-image\.png"/,
    `${pageName} must advertise the deployed absolute OG image URL`);
  assert.match(html, /property="og:image:type" content="image\/png"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /property="og:image:alt" content="Mien Shiang — a private, on-device face scanner"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /name="twitter:image" content="https:\/\/matthewcarlhogan-netizen\.github\.io\/mien-shiang\/og-image\.png"/);
  assert.match(html, /name="twitter:image:alt" content="Mien Shiang — a private, on-device face scanner"/);
}

test("the OG raster is present at the declared 1200x630 dimensions", () => {
  assert.ok(existsSync(`${root}/src/og-image.png`), "the declared OG PNG is missing");
  assert.deepEqual(pngDimensions("src/og-image.png"), { width: 1200, height: 630 });
});

test("the main and Qi Se entries advertise the same social preview", () => {
  assertSocialMetadata(index, "index.html");
  assertSocialMetadata(qise, "qise.html");
});

test("the authored SVG uses the approved palette and carries no personal reading", () => {
  const svg = read("docs/design/og-image.svg");
  for (const hex of ["#4A6E67", "#B0392A", "#C09A2B", "#EDE8DC", "#1B1917"]) {
    assert.match(svg, new RegExp(hex.replace("#", "#")), `${hex} must remain in the OG source`);
  }
  assert.doesNotMatch(svg, /landmark|percentage|reading result|today's reading/i);
});
