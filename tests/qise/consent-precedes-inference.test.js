/*
 * PHASE 10, gate 5 (and Phase 0a) — nothing biometric runs before consent.
 *
 * Two halves, and both are needed.
 *
 * The BEHAVIOURAL half drives the real modules and asserts they throw. The
 * STATIC half walks the source and asserts that every door into the camera or
 * the face mesh is behind the assertion — because the behavioural test can
 * only cover the doors somebody remembered to write a test for, and the defect
 * this guards against is a NEW door.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

import { stripComments } from "../../scripts/copy-scan.js";
import {
  createConsent, memoryStorage, assertConsentGranted, ConsentRequiredError, CONSENT_VERSION,
} from "../../src/qise/consent.js";
import { openCamera, createLandmarkerGuarded } from "../../src/qise/camera.js";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));
const TREES = [join(SRC, "qise"), join(SRC, "ui", "qise")];

const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
}) : []);

const files = TREES.flatMap(walk).filter((f) => f.endsWith(".js"));
const rel = (f) => relative(SRC, f).replace(/\\/g, "/");

/* ── behavioural ─────────────────────────────────────────────────────────── */

test("GATE 0a: the camera module throws if invoked without consent", async () => {
  const denied = createConsent(memoryStorage());
  let getUserMediaCalled = false;

  const mediaDevices = {
    getUserMedia: async () => {
      getUserMediaCalled = true;
      return { getVideoTracks: () => [{}], getTracks: () => [] };
    },
  };

  await assert.rejects(() => openCamera({ consent: denied, mediaDevices }), ConsentRequiredError);
  assert.equal(getUserMediaCalled, false,
    "the camera was opened and the throw happened afterwards, which is not a gate");
});

test("the mesh is behind the same assertion as the camera", async () => {
  const denied = createConsent(memoryStorage());
  let built = false;
  await assert.rejects(
    () => createLandmarkerGuarded({ consent: denied, factory: async () => { built = true; } }),
    ConsentRequiredError);
  assert.equal(built, false);
});

test("with consent, both doors open", async () => {
  // The paired positive control. A gate that blocks everything is not a gate,
  // and this repo has shipped exactly that failure.
  const granted = createConsent(memoryStorage());
  granted.grant();

  const track = { getSettings: () => ({}), applyConstraints: async () => {} };
  const opened = await openCamera({
    consent: granted,
    mediaDevices: { getUserMedia: async () => ({ getVideoTracks: () => [track], getTracks: () => [track] }) },
  });
  assert.ok(opened.stream);
  assert.equal(opened.captureMode, "auto");

  assert.deepEqual(await createLandmarkerGuarded({ consent: granted, factory: async () => ({ ok: true }) }), { ok: true });
});

test("a superseded consent version does not open the door", async () => {
  // Bumping CONSENT_VERSION must actually re-prompt, or the version field is
  // decoration.
  const stale = createConsent(memoryStorage(JSON.stringify({
    granted: true, version: `${CONSENT_VERSION}-old`, timestampIso: "2026-01-01T00:00:00.000Z",
  })));
  await assert.rejects(
    () => openCamera({ consent: stale, mediaDevices: { getUserMedia: async () => ({}) } }),
    ConsentRequiredError);
});

test("assertConsentGranted throws rather than returning false", () => {
  assert.throws(() => assertConsentGranted(createConsent(memoryStorage())), ConsentRequiredError);
  // A boolean can be ignored by a caller who forgot to check it.
  assert.equal(typeof assertConsentGranted, "function");
});

/* ── static ──────────────────────────────────────────────────────────────── */

test("EVERY door into the camera or the mesh sits behind the assertion", () => {
  // The behavioural tests above cover the doors that exist today. This covers
  // the one somebody adds next week.
  const DOORS = /\b(getUserMedia|FaceLandmarker|createFromOptions|detectForVideo)\b/;

  const offenders = [];
  for (const f of files) {
    const code = stripComments(readFileSync(f, "utf8"));
    if (!DOORS.test(code)) continue;
    if (!/assertConsentGranted|consent\.isGranted/.test(code)) {
      offenders.push(`${rel(f)} touches the camera or the mesh with no consent assertion`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n  "));
});

test("the files that DO touch it are the two we expect", () => {
  // If this list grows, the growth should be a deliberate review rather than a
  // silent one.
  const DOORS = /\b(getUserMedia|FaceLandmarker|createFromOptions|detectForVideo)\b/;
  const touching = files
    .filter((f) => DOORS.test(stripComments(readFileSync(f, "utf8"))))
    .map(rel).sort();
  assert.deepEqual(touching, ["qise/camera.js", "ui/qise/app.js"]);
});

test("no module reaches MediaPipe at module scope", () => {
  // src/analysis.js imports the MediaPipe bundle at module scope, which is why
  // nothing can load it under node --test and why it shipped a hard syntax
  // error behind 155 green tests (CLAUDE.md item 18a). It also means the CDN
  // is touched on page load, before any consent exists.
  for (const f of files) {
    const code = stripComments(readFileSync(f, "utf8"));
    const staticImport = code.match(/^\s*import\s[^\n]*["']https?:\/\/[^"']+["']/m);
    assert.equal(staticImport, null,
      `${rel(f)} imports a remote module at module scope: ${staticImport && staticImport[0]}`);
  }
});
