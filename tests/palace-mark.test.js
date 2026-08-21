/*
 * THE CINNABAR THREAD — the one marked palace, and the layers it crosses.
 *
 * The twelve-card grid is twelve near-identical cards, and the measurement has
 * an answer about which of them moved furthest from the subject's own
 * baseline. This suite pins that answer end to end: how it is chosen, what is
 * allowed to cross the projection boundary with it, and the CSS contracts the
 * mark depends on.
 *
 * ── WHY THE STYLE ASSERTIONS LIVE IN A TEST AT ALL ─────────────────────────
 * `src/ui/qise/app.js` cannot be imported under `node --test` (see CLAUDE.md
 * item 44), and `qise.html` is a document, not a module. So the pieces that
 * actually make the mark visible — the filter the CSS references, the spring
 * the reveal animates on, the reduced-motion exemption — are reachable only as
 * text. Reading them as text is worth more than not checking them: every one
 * of these fails silently and invisibly if it drifts, which is the failure
 * mode this repo has shipped twice.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { readTwelvePalaces, PALACES } from "../src/reading/twelve-palaces.js";
import { projectIntegratedReading } from "../src/qise/integrated.js";
import { paletteCss, TYPE } from "../src/ui/qise/palette.js";

const SRC = new URL("../src/", import.meta.url);
const read = (name) => readFileSync(fileURLToPath(new URL(name, SRC)), "utf8");
const QISE_HTML = read("qise.html");
const APP_JS = read("ui/qise/app.js");

/* Zones every palace needs, so a raw fixture measures all twelve. */
const ZONE_KEYS = ["glabella", "center_forehead", "nose_bridge", "nose_apex",
  "eyebrow_right", "eyebrow_left", "upper_eyelid_right", "upper_eyelid_left",
  "outer_eye_right", "outer_eye_left", "temple_right", "temple_left",
  "fortune_forehead_right", "fortune_forehead_left",
  "parent_forehead_right", "parent_forehead_left",
  "periorbital_left", "periorbital_right", "cheek_left", "cheek_right", "chin"];

function makeRaw(overrides = {}) {
  const zones = {};
  for (const key of ZONE_KEYS) {
    zones[key] = {
      deltaEi: 0, deltaMi: 0, deltaContrast: 0, ridge: 0.01, ridgeDelta: 0,
      ridgeAxis: "horizontal", L: 60, b: 15, pixels: 4000,
    };
  }
  for (const [key, deltaMi] of Object.entries(overrides)) {
    if (zones[key]) zones[key] = { ...zones[key], deltaMi };
  }
  return { zones, regime: "full" };
}

const marked = (result) => result.palaces.filter((p) => p.furthestFromBaseline);

// ──────────────────────────────────────────────── choosing the marked palace ─

test("exactly one palace is marked, and it is the one furthest from baseline", () => {
  // nose_apex is the Wealth Palace, and is the only zone moved off baseline.
  const r = readTwelvePalaces(makeRaw({ nose_apex: 4.2 }));
  const hits = marked(r);
  assert.equal(hits.length, 1, "the mark must be unique — it is the focal point of the grid");
  assert.equal(hits[0].key, "wealth");
});

test("distance is ABSOLUTE, so a clear palace can be marked over a shadowed one", () => {
  /*
   * The whole point of the mark is "this is the region that moved", and a
   * palace measuring well BELOW baseline has moved exactly as far as one
   * measuring above it. Ranking on the signed value marks the most shadowed
   * palace instead of the furthest one — which looks correct on any fixture
   * where every delta happens to be positive, and is wrong on half of real
   * captures.
   */
  const r = readTwelvePalaces(makeRaw({ glabella: -6.0, nose_apex: 3.0 }));
  const hits = marked(r);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].key, "life", "the largest MAGNITUDE wins, not the largest value");
  assert.equal(hits[0].tone, "clear", "and it is the clear one, not the shadowed one");
});

test("a tie keeps the earlier palace, so the same frame always marks the same card", () => {
  // glabella is Life (index 0), nose_apex is Wealth (index 1). Equal distance,
  // opposite signs — the case a naive `>=` would resolve to the later palace.
  const r = readTwelvePalaces(makeRaw({ glabella: 5.0, nose_apex: -5.0 }));
  const hits = marked(r);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].key, "life");
});

test("an UNMEASURED palace is never marked, however far it would have been", () => {
  // Travel is bilateral; dropping one side refuses the palace entirely.
  const raw = makeRaw({ temple_right: 99, nose_apex: 2.0 });
  delete raw.zones.temple_left;
  const r = readTwelvePalaces(raw);
  const travel = r.palaces.find((p) => p.key === "travel");
  assert.equal(travel.measured, false);
  assert.equal(travel.furthestFromBaseline, false,
    "null is not a distance, and an unmeasurable palace has no claim to the mark");
  assert.equal(marked(r)[0].key, "wealth");
});

test("when nothing is measurable, nothing is marked", () => {
  const r = readTwelvePalaces({ zones: {} });
  assert.equal(r.measuredCount, 0);
  assert.equal(marked(r).length, 0, "an empty grid must not fall back to marking the first card");
});

test("a face sitting flat on baseline still marks one palace", () => {
  /*
   * Every delta zero: no palace crosses the ±PALACE_TONE_DELTA band, so all
   * twelve read `even`. A selection restricted to graded palaces finds nothing
   * here — and this is the ORDINARY capture, not the edge case. The grid must
   * not lose its focal point on the commonest input.
   */
  const r = readTwelvePalaces(makeRaw());
  assert.equal(r.measuredCount, 12);
  assert.equal(r.palaces.every((p) => p.tone === "even"), true);
  assert.equal(marked(r).length, 1);
});

// ─────────────────────────────────────────────────────────────── the keynote ─

test("every palace carries a keynote, and every keynote names its source", () => {
  /*
   * The keynote is set at 1.5rem italic display — by a wide margin the largest
   * Module A string on the screen. Item 19 rule 2 applies most sharply to the
   * text a reader actually reads, so the attribution is pinned here rather
   * than being left to the general blocklist scan, which does not check it.
   */
  const ATTRIBUTION = /Mian Xiang|Classical Chinese face reading|classical texts?|the texts/i;
  for (const palace of PALACES) {
    assert.ok(palace.keynote, `${palace.key}: needs a keynote — the mark can land on any palace`);
    assert.match(palace.keynote, ATTRIBUTION,
      `${palace.key}: the keynote must say whose reading it is`);
  }
});

test("no keynote reads the Palace of Trials as a health palace", () => {
  /*
   * 疾厄宮 is translated "Health Palace" almost everywhere, and this build
   * takes only its adversity sense on purpose — the reason is recorded at the
   * top of twelve-palaces.js and travels with the palace as translationNote.
   * A keynote is the easiest place for that decision to be quietly undone,
   * because it is one short line written for effect.
   */
  const trials = PALACES.find((p) => p.key === "trials");
  assert.doesNotMatch(trials.keynote, /health|breath|body|monitor|circulation|blood/i,
    "the eighth palace reads adversity, not health — see the translation note");
});

// ────────────────────────────────────────────── what crosses the projection ─

test("the mark crosses the projection boundary but the distance behind it does NOT", () => {
  /*
   * `projectPalaces` is an allow-list, and item 39's argument is that an
   * allow-list stops being one the moment it carries the numbers the record
   * exists not to hold. `deltaMi` is a raw measurement scalar whose only
   * consumer is the comparison that produced the boolean, so the record keeps
   * the decision and drops the measurement.
   */
  const r = readTwelvePalaces(makeRaw({ nose_apex: 4.2 }));
  assert.equal(Number.isFinite(r.palaces[1].deltaMi), true,
    "the reading layer does compute a distance");

  const projected = projectIntegratedReading({ twelvePalaces: r, module: "A" });
  const wealth = projected.twelvePalaces.palaces.find((p) => p.key === "wealth");
  assert.equal(wealth.furthestFromBaseline, true, "the flag must survive");
  assert.ok(wealth.keynote, "the keynote must survive");
  assert.equal("deltaMi" in wealth, false, "the scalar must not");
});

test("the projected flag is a real boolean, never a passed-through truthy value", () => {
  const forged = {
    twelvePalaces: {
      palaces: [{ key: "life", furthestFromBaseline: "yes please" }],
      measuredCount: 0, supportedCount: 0, totalCount: 12,
    },
    module: "A",
  };
  const out = projectIntegratedReading(forged);
  assert.equal(out.twelvePalaces.palaces[0].furthestFromBaseline, false);
});

// ───────────────────────────────────────────────────────── the visible layer ─

test("the marked card is the only thing that gets the cinnabar treatment", () => {
  // Every selector that paints cinnabar is scoped to the selected card. A
  // stray unscoped rule would put the thread on all twelve, which is the
  // "wall of sameness" this exists to break.
  for (const selector of [
    '.palace-card[data-selected="true"]{border-left:2px solid var(--accent-cinnabar)}',
    '.palace-card[data-selected="true"]::after{',
  ]) {
    assert.ok(QISE_HTML.includes(selector), `qise.html must carry: ${selector}`);
  }
  assert.match(QISE_HTML, /--accent-cinnabar:#E34234/,
    "the seal hex is fixed and must not be re-derived from the five-colour palette");
});

test("the seal accent is NOT a sixth entry in the five-colour measurement palette", () => {
  /*
   * palette.js emits the five Su Wen colours, each of which means "this showed
   * in the face". Cinnabar here is chrome marking a UI selection. Letting it
   * into that file would give it a referent it does not have, which is exactly
   * what the "no sixth accent" note in palette.js forbids.
   */
  const css = paletteCss();
  assert.doesNotMatch(css, /accent-cinnabar/,
    "the seal accent belongs in qise.html chrome, not in the measurement palette");
  assert.match(css, /--chi: #B0392A/, "and the five are untouched");
});

test("the paper-noise filter is defined in the document that references it", () => {
  /*
   * url(#paper-noise) resolves against the current document. If the filter is
   * ever moved to an external file it becomes a network request, which is the
   * one thing this product does not make — and the failure is invisible,
   * because an unresolvable filter renders the element with no filter at all.
   */
  assert.match(QISE_HTML, /<filter id="paper-noise">/);
  assert.match(QISE_HTML, /feTurbulence type="fractalNoise" baseFrequency="0\.85" numOctaves="3"/);
  assert.match(QISE_HTML, /filter:url\(#paper-noise\)/);
  // Applied to its own layer, never to the card — `filter` on the card would
  // apply the grain to the text as well and create a containing block.
  assert.match(QISE_HTML, /\.palace-grain\{[^}]*filter:url\(#paper-noise\)/);
  assert.doesNotMatch(QISE_HTML, /\.palace-card\[data-selected="true"\]\{[^}]*filter:/);
});

test("the reveal animates on the SPRING, not on a curve that resembles one", () => {
  /*
   * stiffness 120, damping 25, mass 1.5 gives zeta = 0.9317 and omega_0 =
   * 8.944 rad/s, so the displacement falls below 1/1000 at 779ms. The stops
   * are sampled from the analytic solution. Re-deriving them here would just
   * restate the CSS; what is worth pinning is that the duration still matches
   * the physics and that nobody has swapped in a bezier.
   */
  assert.match(QISE_HTML, /animation:seal-break 779ms both/,
    "779ms is where this spring settles — a rounded duration is a different spring");
  assert.match(QISE_HTML, /animation-timing-function:linear\(0, 0\.0352, 0\.1181/,
    "the easing must be the sampled spring");
  assert.match(QISE_HTML, /animation-timing-function:ease-out;\s*animation-timing-function:linear\(/,
    "and must keep the plain fallback declaration ahead of it");
  assert.match(QISE_HTML,
    /@keyframes seal-break\{from\{clip-path:inset\(50% 0 50% 0\);opacity:\.8\}to\{clip-path:inset\(0 0 0 0\);opacity:1\}\}/);
});

test("the keynote is delayed and the anatomical line is not", () => {
  // The stagger is the interaction: the keynote must arrive as a consequence
  // of the seal opening, not alongside it.
  assert.match(QISE_HTML, /\.palace-keynote\{animation:keynote-rise \.6s ease-out \.35s both\}/);
  assert.doesNotMatch(QISE_HTML, /\.palace-anatomy\{[^}]*animation:/);
});

test("reduced motion turns off the seal break but keeps the mark", () => {
  /*
   * The thread, the node and the grain are all static, so the card is still
   * marked with motion disabled. A clip-path animation left running here would
   * be the one piece of this treatment that ignores the preference.
   */
  const block = QISE_HTML.match(/@media \(prefers-reduced-motion: reduce\)\{[\s\S]*?\n\}/);
  assert.ok(block, "the reduced-motion block must exist");
  assert.match(block[0], /\.palace-card\[data-selected="true"\] \.palace-reveal/);
  assert.match(block[0], /\.palace-card\[data-selected="true"\] \.palace-keynote/);
  assert.match(block[0], /\.onboarding-terminal-text\{animation:none\}/);
  assert.doesNotMatch(block[0], /border-left|--accent-cinnabar/,
    "reduced motion must not remove the mark itself");
});

test("grid body copy holds the locked baseline measurements", () => {
  assert.match(QISE_HTML, /\.palace-reveal p\{font-size:\.86rem;line-height:1\.65/);
});

test("the keynote outranks the locked body rule instead of losing to it", () => {
  /*
   * REGRESSION. The keynote is a <p> inside .palace-reveal, so the locked body
   * rule `.palace-reveal p` (0,1,1) outranks a bare `.palace-keynote` (0,1,0).
   * Written the obvious way, the 1.5rem display line rendered at .86rem —
   * pixel-identical to the paragraph under it, which is precisely the
   * sameness the whole treatment exists to break.
   *
   * Both rules were individually correct; the cascade between them was the
   * defect, so nothing that reads either rule on its own can see it. Caught
   * by rendering in a browser and reading getComputedStyle. What is checkable
   * here is that the qualifying `p` survives, because dropping it as
   * redundant reintroduces the bug in full and in silence.
   */
  assert.match(QISE_HTML, /\.palace-reveal p\.palace-keynote\{[^}]*font-size:1\.5rem/,
    "the keynote selector must out-specify `.palace-reveal p`");
  assert.doesNotMatch(QISE_HTML, /\n\.palace-keynote\{/,
    "a bare .palace-keynote rule loses to the body rule and renders at .86rem");
});

test("the two ritual type roles are emitted, and neither redefines an existing role", () => {
  const css = paletteCss();
  assert.match(css, /--font-ritual: 'Cormorant Garamond'/);
  assert.match(css, /--font-terminal: 'JetBrains Mono'/);
  // The existing roles are untouched: restyling every screen to serve one card
  // is the opposite of a scoped change.
  assert.match(css, /--passage: 'EB Garamond'/);
  assert.match(css, /--numeric: 'IBM Plex Mono'/);
  // Named family first, system fallback behind it — see the no-@font-face note.
  assert.ok(TYPE.ritual.stack.endsWith("serif"));
  assert.ok(TYPE.terminal.stack.endsWith("monospace"));
});

test("no webfont is fetched for any of this", () => {
  /*
   * The families are declared, not downloaded. Google Fonts was removed from
   * both entry points deliberately: it is a third-party request on every load
   * for a product whose claim is that nothing leaves the device, and it is a
   * cold-start dependency that breaks the offline-first posture.
   */
  for (const [name, raw] of [["qise.html", QISE_HTML], ["index.html", read("index.html")]]) {
    /*
     * Comments are stripped FIRST, and that is not a convenience. Both files
     * carry a written explanation of why there is no webfont, and those
     * explanations necessarily contain the words "@font-face" and
     * "fonts.googleapis.com". Scanning the raw text reports the note as the
     * violation it exists to prevent — item 22's defect exactly: a scanner
     * confidently wrong about text it misread. Both comment syntaxes matter;
     * one note is an HTML comment and the other is a CSS comment inside
     * <style>.
     */
    const text = raw.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(text, /fonts\.googleapis\.com|fonts\.gstatic\.com/, `${name}: no Google Fonts`);
    assert.doesNotMatch(text, /@import\s+url\(/, `${name}: no font @import`);
    assert.doesNotMatch(text, /@font-face/, `${name}: no @font-face for files that do not exist`);
    // Paired positive control: a "no matches" result means nothing unless the
    // stylesheet survived the strip. Both pages declare their palette on :root.
    assert.match(text, /:root\{/, `${name}: the strip removed real CSS`);
  }
});

// ─────────────────────────────────────────────────────────────── the markup ─

test("the onboarding line renders only on a first reading", () => {
  // Guarded at the call site, so it cannot appear for a returning user.
  assert.match(APP_JS, /\$\{firstReading[\s\S]{0,400}?onboarding-terminal-text/);
  assert.match(APP_JS, /The meridian shifts daily\. Tomorrow, another gate opens\./);
});

test("the acupuncture node is announced, not hidden from assistive tech", () => {
  /*
   * On a closed card the dot is the ONLY thing saying this palace was picked.
   * aria-hidden would withhold the single piece of information the mark exists
   * to carry — the same mistake as marking a value and not its basis.
   */
  assert.match(APP_JS, /class="acupuncture-node" role="img" aria-label="furthest from your baseline/);
  assert.doesNotMatch(APP_JS, /class="acupuncture-node"[^>]*aria-hidden/);
});

test("the grain layer is decorative and inert", () => {
  assert.match(APP_JS, /class="palace-grain" aria-hidden="true"/);
  assert.match(QISE_HTML, /\.palace-grain\{[^}]*pointer-events:none/);
});
