/*
 * The capture flow's structural invariants.
 *
 * `ui.js` cannot be imported under `node --test` — it imports `analysis.js`,
 * which imports the MediaPipe bundle from a CDN at module scope (CLAUDE.md
 * item 18a). So the flow's behaviour is not reachable from a test, and the
 * properties below are the ones that CAN be pinned from the markup.
 *
 * Each is a property that silently degrades rather than breaking: the page
 * still renders, the buttons still work, and the flow is merely worse. That is
 * exactly the class of thing that gets tidied away.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = (p) => readFileSync(fileURLToPath(new URL(`../src/${p}`, import.meta.url)), "utf8");
const html = src("index.html");

// ───────────────────────────────────────────────────── the primary action ──

test("the read action precedes the picker in source order", () => {
  const go = html.indexOf('id="go"');
  const pick = html.indexOf('id="pick"');

  assert.ok(go > -1, "the read button is missing");
  assert.ok(pick > -1, "the picker button is missing");

  // `go` starts hidden, so the picker is still the first thing rendered and
  // the first thing a screen reader reaches. The order matters only once a
  // photo exists: at that point `go` is the primary action, and a primary
  // action rendered BELOW the secondary one reads as the lesser of the two —
  // which is how the flow shipped, with the still-primary-styled picker
  // sitting above it offering to discard the photo just chosen.
  assert.ok(go < pick,
    "the read button must come before the picker, or promoting it puts the " +
    "primary action underneath the secondary one");
});

test("the read button does not start with the secondary style", () => {
  const tag = html.match(/<button id="go"[^>]*>/);
  assert.ok(tag, "the read button is missing");
  // It is promoted by removing `ghost`, so shipping it WITH `ghost` in the
  // markup means the promotion is a no-op and the demoted picker is the only
  // button that looks primary.
  assert.ok(!/\bghost\b/.test(tag[0]),
    `the read button must not carry the ghost class: ${tag[0]}`);
  assert.match(tag[0], /\bhidden\b/, "the read button must start hidden");
});

// ─────────────────────────────────────────────────────────── the step rail ──

test("the step rail has three steps and exactly one starts current", () => {
  const rail = html.match(/<ol class="steps"[^>]*>([\s\S]*?)<\/ol>/);
  assert.ok(rail, "the step rail is missing from index.html");

  const items = rail[1].match(/<li\b[^>]*>/g) ?? [];
  assert.equal(items.length, 3, `expected three steps, found ${items.length}`);

  const current = items.filter((li) => /\bis-current\b/.test(li));
  assert.equal(current.length, 1,
    `exactly one step must start current, found ${current.length}`);

  // Colour alone is not a state. The rail tints the current step cinnabar, so
  // without aria-current the step is unannounced to anyone not seeing it.
  assert.match(current[0], /aria-current="step"/,
    "the current step must carry aria-current, not only a colour");
});

// ───────────────────────────────────────────────────── framing guidance ──

test("framing guidance survives a chosen photo", () => {
  // It used to live inside `.empty`, which `ui.js` replaces with the chosen
  // image the instant a file is picked. So the advice disappeared at exactly
  // the moment the user could still act on it and retake the shot.
  const empty = html.match(/<div class="empty">([\s\S]*?)<\/div>/);
  assert.ok(empty, "the empty state is missing");
  assert.ok(!/indirect light/i.test(empty[1]),
    "framing guidance must not live inside the empty state — it is destroyed " +
    "when a photo is chosen");

  assert.match(html, /class="shot-hint"[^>]*>[\s\S]*?indirect light/i,
    "framing guidance must persist outside the empty state");
});

// ──────────────────────────────────────────────── the un-mirror control ──

test("the un-mirror control keeps its id, its default, and gains a reason", () => {
  const input = html.match(/<input[^>]*id="mirror"[^>]*>/);
  assert.ok(input, "the mirror toggle is missing");

  // Laterality depends on this (CLAUDE.md item 5): front cameras mirror the
  // preview, and the un-mirror runs before landmarking. Defaulting it off
  // swaps the subject's left and right cheeks — Lung for Liver — on the
  // capture path most people use.
  assert.match(input[0], /\bchecked\b/,
    "the un-mirror toggle must stay checked by default");

  assert.match(html, /class="toggle-why"/,
    "the un-mirror control must carry its reason: it is load-bearing, and it " +
    "is not a choice a user can reason about from the label alone");
});
