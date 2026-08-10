#!/usr/bin/env node
/*
 * ENGINE BENCHMARK — and the bit-exactness check that has to travel with it.
 *
 * ── WHY THIS IS A SCRIPT AND NOT A NUMBER IN A COMMIT MESSAGE ──────────────
 * The Verification Protocol in CLAUDE.md bans unverified success claims, and a
 * speedup is exactly the kind of claim that is easy to assert and easy to get
 * wrong: a faster pipeline that measures something slightly different is not a
 * faster pipeline, it is a regression with a good stopwatch. So this prints two
 * things together and neither is useful alone —
 *
 *   TIMINGS, over realistic shapes: the twelve ROIs in zones.js, built against
 *     MediaPipe's canonical mesh at the 768x1024 working canvas analysis.js
 *     actually uses. Square synthetic patches would flatter the mask handling
 *     and misrepresent the edge bands in the convolution.
 *
 *   A FINGERPRINT: every scalar the pipeline produces, at 17 significant
 *     digits. Write it to a file before a change and diff it after. The
 *     optimisations in engine.js were all designed to be bit-exact, so the
 *     correct diff is EMPTY. An epsilon-sized difference is not a rounding
 *     detail to be waved through — it means an optimisation changed the
 *     arithmetic, and the reviewed claim no longer holds.
 *
 * Usage:
 *   node scripts/engine-bench.mjs                  # timings + fingerprint size
 *   node scripts/engine-bench.mjs out.txt          # also write the fingerprint
 *   diff before.txt after.txt                      # the check that matters
 *
 * This measures the pipeline on ONE desktop-class machine under Node. It says
 * nothing about a phone, where the same work runs several times slower on a
 * different JIT. Treat the RATIO between two runs on the same machine as the
 * result; the absolute milliseconds are not portable and are not a target.
 */

import { writeFileSync } from "node:fs";
import { ROIS } from "../src/zones.js";
import { roiFootprint } from "../src/roi.js";
import { shadesOfGray, regionStats, rawScalars, analyse } from "../src/engine.js";
import { canonicalFace } from "../tests/fixtures/canonical-face.js";

const W = 768, H = 1024;

// Deterministic. A benchmark whose input moves cannot be compared with itself.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A synthetic capture: warm skin under a vignette, sensor grain, drawn furrows
 * on both axes, and colour features placed so the erythema and pigmentation
 * paths both EMIT. A frame that trips no threshold would leave the observation
 * arithmetic out of the fingerprint entirely.
 */
function buildFrame() {
  const rnd = rng(12345);
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lit = 1 - 0.25 * (((x - W / 2) / W) ** 2 + ((y - H / 2) / H) ** 2);
      let r = 205 * lit, g = 158 * lit, b = 137 * lit;
      if (y > 200 && y < 340 && (y % 17) < 2) { r -= 26; g -= 22; b -= 20; }   // forehead lines
      if (y > 330 && y < 400 && (x % 13) < 2) { r -= 24; g -= 20; b -= 18; }   // glabella furrows
      /* Colour features sized so the emitted severities land MID-RANGE. A
       * stronger patch pegs sev() at its clamp, and a clamped severity is
       * insensitive to the very constants the fingerprint exists to notice —
       * verified: at the original amplitude, changing DELTA_EI_FULL_SCALE
       * produced no diff at all. */
      if (y > 470 && y < 620 && (x < 300 || x > 468)) { r += 6; g -= 2; }     // malar redness
      if (y > 605 && y < 650 && x > 290 && x < 480) { r -= 14; g -= 12; b -= 10; }  // perioral pigment
      const n = (rnd() - 0.5) * 9;
      d[i] = r + n; d[i + 1] = g + n; d[i + 2] = b + n; d[i + 3] = 255;
    }
  }
  return d;
}

/* Even-odd fill of the hull. analysis.js rasterises with a real 2D context,
 * which is not available here; what matters for the benchmark is that the mask
 * is the true convex footprint, so the ~66% fill of each bounding box — and
 * therefore the mask-skip behaviour of every loop — is realistic. */
function fillHull(hull, x0, y0, rw, rh) {
  const mask = new Uint8Array(rw * rh);
  const n = hull.length;
  for (let y = 0; y < rh; y++) {
    const py = y + y0 + 0.5;
    for (let x = 0; x < rw; x++) {
      const px = x + x0 + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const yi = hull[i].y, yj = hull[j].y;
        if ((yi > py) !== (yj > py)) {
          const xint = hull[i].x + ((py - yi) / (yj - yi)) * (hull[j].x - hull[i].x);
          if (px < xint) inside = !inside;
        }
      }
      mask[y * rw + x] = inside ? 1 : 0;
    }
  }
  return mask;
}

function buildRegions(balanced) {
  const pts = canonicalFace();
  const regions = {};
  for (const [key, def] of Object.entries(ROIS)) {
    const fp = roiFootprint(def, pts, W, H);
    if (fp.dropped) {
      // Never silent: a dropped zone is how the malar gate died (CLAUDE.md 23).
      console.error(`  WARNING zone dropped: ${key} (${fp.dropped})`);
      continue;
    }
    const { hull, x0, y0, rw, rh } = fp;
    const rgba = new Uint8ClampedArray(rw * rh * 4);
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const i = y * rw + x, src = ((y + y0) * W + (x + x0)) * 4;
        rgba[i * 4] = balanced[src];
        rgba[i * 4 + 1] = balanced[src + 1];
        rgba[i * 4 + 2] = balanced[src + 2];
        rgba[i * 4 + 3] = 255;
      }
    }
    regions[key] = {
      ...def, key, hull, w: rw, h: rh,
      mask: fillHull(hull, x0, y0, rw, rh), rgba,
    };
  }
  return regions;
}

/** Every scalar the pipeline produces, at full precision, in a stable order. */
function fingerprint(raw, obs) {
  const num = (v) => (v === null ? "null"
    : typeof v === "number"
      ? (Number.isFinite(v) ? v.toExponential(17) : String(v))
      : String(v));
  const lines = [];
  for (const k of Object.keys(raw.baseline).sort()) {
    lines.push(`baseline.${k}=${num(raw.baseline[k])}`);
  }
  for (const z of Object.keys(raw.zones).sort()) {
    const zone = raw.zones[z];
    for (const k of Object.keys(zone).sort()) lines.push(`${z}.${k}=${num(zone[k])}`);
  }
  for (const o of obs.observations) {
    const measured = Object.keys(o.measured).sort()
      .map((k) => `${k}=${num(o.measured[k])}`).join(" ");
    lines.push(`obs ${o.zone} ${o.condition} sev=${num(o.severity)} ` +
      `conf=${num(o.confidence)} ${measured}`);
  }
  return lines.join("\n");
}

function time(label, reps, fn) {
  fn();                                            // warm the JIT
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < reps; i++) fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / reps;
  console.log(`  ${label.padEnd(30)} ${ms.toFixed(2).padStart(7)} ms/op  (${reps} reps)`);
  return ms;
}

// ────────────────────────────────────────────────────────────────── run ─────
const frame = buildFrame();
const balanced = shadesOfGray(frame);
const regions = buildRegions(balanced);

const zoneCount = Object.keys(regions).length;
if (zoneCount === 0) {
  console.error("no zones survived extraction — nothing was measured");
  process.exit(1);
}
let masked = 0;
for (const r of Object.values(regions)) for (const m of r.mask) masked += m;
console.log(`frame ${W}x${H}   zones ${zoneCount}   masked px ${masked}\n`);

console.log("timings");
const wb = time("shadesOfGray (whole frame)", 12, () => shadesOfGray(frame));
const st = time("regionStats (all zones)", 12, () => {
  for (const r of Object.values(regions)) r.stats = regionStats(r.rgba, r.mask, r.w, r.h);
});
for (const r of Object.values(regions)) r.stats = regionStats(r.rgba, r.mask, r.w, r.h);
const rs = time("rawScalars (ridge pyramid)", 8, () => rawScalars(regions));
console.log(`  ${"TOTAL".padEnd(30)} ${(wb + st + rs).toFixed(2).padStart(7)} ms\n`);

const raw = rawScalars(regions);
const obs = analyse(regions, raw);
const fp = fingerprint(raw, obs);

/* A fingerprint of nothing is the false green this repo has shipped twice, so
 * the fixture is checked before its output is trusted.
 *
 * The saturation check is not decoration. sev() clamps at 1, and a clamped
 * severity is insensitive to the full-scale constant that produced it — with an
 * earlier, stronger malar patch every severity pegged at exactly 1.0, and
 * perturbing DELTA_EI_FULL_SCALE changed nothing in the fingerprint at all. A
 * comparison that cannot see a changed constant is not a comparison. */
const lines = fp.split("\n").length;
const saturated = obs.observations.filter((o) => o.severity >= 1).map((o) => o.condition);
if (lines < 100 || obs.observations.length < 3 || saturated.length) {
  console.error(`fixture no longer exercises the pipeline: ${lines} values, ` +
    `${obs.observations.length} observations` +
    (saturated.length ? `, severity pegged at the clamp for ${saturated.join(", ")}` : ""));
  process.exit(1);
}
console.log(`fingerprint: ${lines} values, ${obs.observations.length} observations ` +
  `(max severity ${Math.max(...obs.observations.map((o) => o.severity)).toFixed(3)})`);

const out = process.argv[2];
if (out) {
  writeFileSync(out, fp);
  console.log(`wrote ${out} — diff it against a run from before your change`);
} else {
  console.log("pass a filename to write the fingerprint for diffing");
}
