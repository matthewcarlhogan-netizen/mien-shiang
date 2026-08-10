# HANDOFF.md

Rolling state of the build. Updated at the end of every phase.
Phase 0 evidence lives in [AUDIT.md](AUDIT.md).

---

## Current position

**Phase 0 (repo audit) — complete.** See AUDIT.md.
**Phase 1 (capture and analysis core) — code complete, exit criterion NOT met.**

The blocker is stated in full under "Blocked" below: Phase 1's exit requires
verification on **real device photos in varied lighting**, and no face photo
exists in this environment. Everything that can be verified without one has
been, and everything that cannot is listed rather than assumed.

Environment for all verification: Windows 11 Pro 10.0.26200, PowerShell 5.1,
Node v24.19.0, on the user's own machine (no sandbox divergence). Desktop
Chromium only — no Android or iOS device was touched.

---

## Verified this session

### Test suite — 96 tests, 95 pass, 1 fail

```
ℹ tests 96
ℹ pass 95
ℹ fail 1
```

The single failure is the pre-existing `copy-guard` failure on
`rules.js:183`, unchanged from Phase 0. 39 tests were added (25 geometry,
14 debug view) and all pass.

### Real MediaPipe, both delegates, on real hardware

Not a mock. The actual `tasks-vision@0.10.18` runtime, the actual float16
`.task` model:

```
GPU:  delegateActuallyUsed: "GPU",  attempts: [{GPU, ok:true}],  loadMs: 2503
      blendshapes field: present,  blank canvas → 0 faces (no-face path reached)

CPU:  (GPU forced to throw, real factory underneath)
      delegateActuallyUsed: "CPU",  attempts: [GPU failed, CPU ok]
      cpuLoadMs: 274,  cpuDetectMs: 127,  detect() ran: true
      user saw: "Graphics acceleration unavailable — using the slower path…"
```

So the CPU fallback is exercised at both levels: the routing logic (unit tests,
injected factory) **and** the real MediaPipe CPU delegate constructing and
running `detect()` in a browser.

### Geometry agrees between Node and the browser

The same synthetic face classified `square` in both, with an identical trace:

```
faceLength / bizygomaticWidth            1.150  <  1.25
bigonialWidth / bizygomaticWidth         0.950  >= 0.9
frontotemporalWidth / bizygomaticWidth   0.900  >= 0.88
```

### Debug view renders, with the working shown

Rendered into the live page and read back: capture block (compute path, tilt,
frontality), the four widths, the shape with its full ratio table, near-miss
alternatives, Three Courts with the trichion caveat, facial fifths, the
width-to-height proportion with its definition and neutrality note, and the
expression block framed as momentary state.

### Service worker

`mienshiang-v2`, 14 shell entries including all four new modules; the stale v1
cache was evicted on activate. Verified `debugviewPrecached: true`.

---

## Blocked — Phase 1 cannot exit without this

**Phase 1 exit criterion:** "single-selfie capture → landmark set → geometry
report, verified on real device photos in varied lighting, with GPU and CPU
paths both exercised."

GPU and CPU are both exercised. **The real-photo half is not, and cannot be
from here** — there is no face photo in this environment, and going to find a
photo of a real person online would be someone's biometric data collected
without consent, which is the exact thing this product is built not to do.

What is therefore still unproven, and must not be described as working:

- That MediaPipe's landmark indices land where `geometry.js` assumes on a real
  face. The indices were read out of the library's own `FACE_LANDMARKS_FACE_OVAL`
  ring, so the *identities* are verified — but their behaviour on real anatomy,
  across lighting and skin tones, is not.
- Whether the shape thresholds sort real faces sensibly. They are conventional
  heuristics with no labelled ground truth, exactly like the severity constants.
- Whether the frontality threshold (0.12) rejects the right photos.
- Whether the roll correction holds on real head poses rather than a synthetic
  rotation.
- The full `runAnalysis` path end to end.

**To unblock, one of:**

1. Drop 3–5 selfies into a scratch folder — varied lighting, at least one
   off-angle, at least one mid-expression — and say where. They stay local;
   nothing is uploaded.
2. Or defer real-photo validation to the on-device test in Phase 4 and accept
   Phase 1 as code-complete-but-unvalidated. Workable, but it means the
   thresholds stay unexercised for three more phases.

Recommendation: option 1, now. The thresholds are the part most likely to be
wrong, and they are cheapest to fix before Phase 2 layers a reading on top.

---

## Reported but unverified

- Engine parity with the original Python (`engine.js:4` comment; no test).
- Colorimetry on real skin.
- CI matrix — **still no git remote, so CI has never run.**
- Bubblewrap/TWA; all iOS behaviour.

---

## Module boundary — established (Phase 2 prerequisite)

Done before any reading copy, as instructed.

```
engine.js  rawScalars()   neutral physical quantities   <- owned by NEITHER module
              |                    |
              v                    v
  adapters/entertainment.js   adapters/safety.js
     MODULE A  glow only        MODULE B  referrals, flag-gated
```

- **The boundary sits BELOW labelling.** `analyse()` emits `condition:
  "erythema" | "pallor" | …` — clinical vocabulary. Module A consumes
  `rawScalars()` instead, so it never sees a condition name. A test walks
  Module A's entire returned object, keys and values, against a 31-term
  blocklist.
- **Measurement stays in `engine.js`.** Neither adapter owns or re-implements
  a measurement function; a test asserts that against all eight of them.
  `analyse()` is now built on top of `rawScalars()`, so a delta is computed in
  exactly one place — verified behaviour-preserving (the 44 pre-existing
  science/rules tests still pass unchanged).
- **The flag gates both doors.** Verified by flipping the real constant:

  ```
  flag true  -> wellness            adapterReferrals 1  legacyReferrals 1  halted true
  flag false -> entertainment-only  adapterReferrals 0  legacyReferrals 0  halted false
  ```

  Gating only the adapter would have left `runRules()` still emitting
  referrals while the flavour read "entertainment-only". That hole was real
  and is now closed and pinned.
- **Referral thresholds have one home.** `rules.js` imports
  `SAFETY_THRESHOLDS` from the safety adapter rather than repeating literals.
- **No reading copy written.** Both adapters return values and machine-readable
  tokens (`note: "colourNotMeasurableFromThisPhoto"`), never sentences, so the
  copy lint will have exactly one surface to scan.

> **Phase 5 history feature must handle basis changes between sessions — see
> basis key on glow output.**

### Two things worth knowing before Phase 2 and Phase 5

**Unmeasurable colour is dropped, never zeroed** — in both modules. Module A
drops the warmth component and rescales; Module B returns `assessable: false`
rather than "found nothing". Zeroing would have scored deeper skin tones lower
and turned a non-measurement into a silent all-clear, from one mistake.

**`glowIndex` is only comparable within its `basis`.** Rescaling means dropping
a below-average component makes the index go *up* — 97 becomes 100 with nothing
about the complexion changed. Every result carries a `basis` key; any history
feature must group by it. This is a Phase 5 trap, defused early.

### Still open on the boundary

`rules.js` still mixes both modules' content in one `RULES` array — the flag
filters it correctly, but Module A and Module B rules remain in one file with
one copy deck. Splitting that is the copy work, and is the natural first step
of Phase 2.

No About screen yet, so the flavour is not surfaced to the user.

---

## Gaps, largest first

1. **Offline analysis still fails.** The WASM and `.task` model are still not
   precached (`sw.js` caches them only on first successful fetch). Phase 4's
   exit criterion remains unmet. Deliberately not fixed here — it is a Phase 4
   item and bundling it into Phase 1 would muddy the commit.
3. **Copy lint scope.** `copy-guard.test.js` still imports only `RULES`.
   `index.html`, `ui.js` and `engine.js` remain unscanned. The new
   `debugview.test.js` does assert its own strings carry no medical or rating
   vocabulary, so the new surface is guarded — but the old surface is not.
4. Phase 2: no Five Elements, Three Courts *interpretation*, Twelve Palaces,
   qi se, or "What the science says" screen. The geometry they need now exists.
5. Phase 3: no attractiveness guard as a repo-wide test, no egress guard, no
   report control, no privacy policy, no `COMPLIANCE.md`.
6. Phase 4: nothing hosted, packaged or installed.

### Minor, noted not fixed

- `sw.js` caches every same-origin GET, including query-string variants, with
  no size bound. Harmless today (nothing appends query strings) but it means
  the cache can grow without limit if cache-busting is ever introduced.
- ~~`mien-shiang-deploy.zip` is still a committed build artifact and still not in
  `.gitignore`.~~ **Resolved.** Removed from the tree, and `*.zip` added to
  `.gitignore` so the next one cannot be committed by accident. `dist/` is
  produced by `scripts/build.js`; an archive of it is an artefact, not a source,
  and a second copy of the app in the repo can drift from `src/` silently.

---

## Decisions taken this phase, so they are not silently re-litigated

- **fWHR is computed, not omitted** — but pinned to the eyelid-based definition,
  carried with a `presentAs` constraint, and displayed as a plain proportion
  with the "not a measure of character" caveat attached. It is never mapped to a
  trait. CLAUDE.md item 10.
- **Geometry emits no meaning.** `geometry.js` returns numbers and a shape label
  with its reason. All interpretation is Phase 2, in a different module, so the
  measurement stays checkable independently of the reading.
- **`oval` is a residual class**, and both the data and the view say so.
- **Purity as a testing strategy.** `geometry.js`, `expression.js`,
  `debugview.js` and `landmarker.js` avoid DOM and CDN imports specifically so
  they can be tested with no browser and no face photo. CLAUDE.md item 14.
- **Blendshapes are state, never traits** — written into `expression.js` as an
  exported constant and asserted in the view tests.

---

---

## Phase 2 — reading engine

### Verified this session

- **159 tests, 159 passing.** `ℹ tests 159 / pass 159 / fail 0`. The
  `copy-guard` failure carried since `d9de32b` is resolved.
- **rules.js is split.** `zones.js` (measurement geometry) and
  `rule-engine.js` (machinery) are owned by neither module; `rules-a.js` and
  `rules-b.js` hold the two copy decks; `rules.js` is a composition root
  containing no copy at all. Module B is **composed in** when the flag is on
  rather than filtered out afterwards — composition fails closed, a filter
  fails open.
- **TCM-202 resolved as directed.** The line moved to Module B as
  `SG-010-PERSISTENT-PATTERN` with the supplied wording, categorised
  `safety_advisory` so it does not halt the reading, and rendered under
  `MODULE_B_DISCLAIMER`. Module A has no replacement, and a test asserts the
  absence.
- **Module A copy is guarded on four axes** — tradition attribution with the
  source named, no health vocabulary, no assertive second person, no verdicts —
  across every registered surface, not just the rules.
- **Disagreements render.** Four `sourcesDiffer` notes on a full reading,
  through one consistent pattern, verified in the browser.
- **The science screen is one tap from results**, verified live: dialog opens on
  a single click, states all four required findings, cites Willis & Todorov
  (2006), and a test rejects apologetic framing.
- **Qi se partial basis**, verified live: `"Today's reading is based on two of
  three colour signals — complexion warmth wasn't measurable in this lighting."`
- **The app boots**, verified from a cleared cache after the defect below.

### The defect this phase found

`src/analysis.js` did not parse — two `const raw` bindings in one function,
introduced by the module-boundary commit. `ui.js` imports it, so **the app did
not start at all**, and 155 tests were green while that was true. analysis.js
imports MediaPipe from a CDN at module scope, so no test file could import it,
so nothing covered it.

`tests/source-integrity.test.js` now parses every file in `src/` regardless of
the import graph, and also checks SHELL entries and local imports resolve. Its
encoding check immediately caught a second, already-shipped defect: `ui.js` had
mojibake from an earlier PowerShell round-trip, rendering `—` as `â€"` on
screen.

### Reported but unverified

- **End-to-end reading from a real capture.** Still blocked on the same thing as
  Phase 1: there is no face photo in this environment. The reading has been
  driven end-to-end with synthetic landmark sets and synthetic scalars, in both
  Node and a browser, but not once from a camera.
- Whether the Five Elements thresholds sort real faces sensibly.
- Whether the qi se bands (75 / 55) land usefully on real complexions.
- CI — still no git remote, so it has still never run.

### Unknown

- How the reading reads to a person who is not its author. No one has seen it.
- Whether six-of-twelve palaces feels informative or truncated in use.

---

---

## Phase 3 — compliance harness

### Verified this session

- **199 tests, 199 passing.** `ℹ tests 199 / pass 199 / fail 0`.
- **Bundle lint green on BOTH flavours**, run against `dist/`:
  `copy blocklist ok · attractiveness ok · egress allowlist ok · biometric egress ok`
  (363 user-facing strings extracted on wellness, 353 on entertainment-only).
- **The entertainment build genuinely omits Module B.** `scripts/build.js`
  replaces `adapters/safety.js`, `rules-b.js` and `modulebview.js` with stubs.
  Verified by inspection of `dist/`: none of "circulation", "iron levels",
  "dermatologist" or "not as a diagnosis" is present. This is what makes the
  Play Health declaration true of the artefact rather than only of its
  behaviour.
- **Copy lint now covers `index.html`, `ui.js` and `engine.js`.** A canary
  asserts a known term is found, in `index.html` specifically, with the exact
  required failure message.
- **CI dry-run: 19 checks, all passing**, including the paired negative control
  (a missing file must 404). `act` is unavailable — it needs Docker — so each
  workflow step was executed directly instead.
- **App boots from a cleared cache**; consent gate blocks; the science, report
  and about dialogs are all present and wired.
- **Report payload verified clean**: exactly
  `{type, reason, note, sessionId, moduleFlag}`, note capped at 500.

### Reported but unverified

- **CI has still never actually run** — no git remote. The workflow was
  dry-run locally on Windows only. The ubuntu and macos legs, and Node 20/22,
  are unexercised.
- The privacy policy and terms have **not been reviewed by a lawyer**. The
  terms page says so on its face.
- `privacy@[yourdomain].com` is a placeholder. No domain is registered.
- `assetlinks.json` carries a zeroed fingerprint placeholder.

### Unknown

- Whether a Play reviewer accepts "does not exhibit health features" for the
  entertainment build given the disclaimer text that remains. The reasoning is
  written up in COMPLIANCE.md; it has not been tested against a real review.
- Whether the `isProse` heuristic misses copy shapes not yet written.

### Decisions taken, so they are not silently re-litigated

- **A build step was added**, against the standing "no build step" decision.
  Three Phase 3 requirements (lint the bundle, egress-guard the bundle, CI
  `npm run build`) presuppose an artefact, and the flavour split needs Module B
  absent rather than unreachable. It has no dependencies and does no transform.
- **Google Fonts was removed** rather than allowlisted. It is a third-party
  request on every load from a product whose claim is that nothing leaves the
  device, and it broke offline cold start.
- **The privacy policy describes only what the app actually does.** Sentry and
  RevenueCat are not integrated, so their sections are marked "Not currently
  active" instead of being written as live collection. A policy asserting
  collection that does not happen is an inaccurate legal disclosure.
- **Bare `score` is not on the attractiveness blocklist.** MediaPipe's
  blendshape API uses it; person-scoped compounds are matched instead.

## Exact next action

### Phase 3 exit criteria

| # | Criterion | Status |
|---|---|---|
| 1 | copy-guard scans index.html, ui.js, engine.js — confirmed by canary | ✅ |
| 2 | copy-guard covers the built bundle | ✅ both flavours |
| 3 | Assertive-phrasing guard passes | ✅ |
| 4 | Attractiveness-score guard passes | ✅ |
| 5 | Egress guard passes against the bundle | ✅ |
| 6 | Report control exists, tested, payload clean | ✅ |
| 7 | Privacy policy at /privacy, linked from 4 locations | ⚠️ **3 of 4** — consent gate, footer, About. The paywall does not exist yet (Phase 5). |
| 8 | COMPLIANCE.md with real answers, both flavours | ✅ |
| 9 | CI configured and would pass on push | ⚠️ **dry-run only** — 19/19 locally, on Windows. No remote, so never actually run. |
| 10 | About screen shows correct flag state | ✅ |
| 11 | 0 test failures | ✅ 199/199 |
| 12 | source-integrity.test.js still passes | ✅ untouched and passing |
| 13 | HANDOFF updated | ✅ this section |

Two criteria are short, both for the same reason: the thing they depend on does
not exist yet (a paywall screen; a git remote). Neither is blocked by code.

---

**Phase 2 exit is met except for its first criterion.**

| Criterion | Status |
|---|---|
| End-to-end reading renders from a real capture | ❌ **blocked — no face photo available** |
| `rules.js` split, no mixed-module copy remains | ✅ |
| `copy-guard` green, including the pre-existing failure | ✅ 159/159 |
| Science screen exists, reachable in one tap | ✅ verified live |
| Every string tradition-attributed, never assertive | ✅ enforced by tests |
| HANDOFF updated with the three sections | ✅ |
| No copy asserts character, health or attractiveness | ✅ enforced by tests |

## Exact next action — Phase 4

Three things gate Phase 4, in this order:

1. **Add a git remote and push.** CI has never executed. Everything above is
   verified on one platform by one person; the matrix exists precisely because
   three defects in this repo's history were invisible on a single platform.
   `git remote add origin <url> && git push -u origin main`.

2. **Real-photo validation.** Still outstanding from Phase 1 and Phase 2, still
   the same ask: 3–5 selfies saved locally, varied lighting, at least one
   off-angle, at least one mid-expression. The reading has never once been
   driven from a camera. This gates Phase 1's exit, Phase 2's first criterion,
   and Phase 4's device test.

3. **A domain.** `privacy@[yourdomain].com` and the hosted policy URL are both
   placeholders, and the Play listing needs a real privacy URL. Registering it
   also unblocks the HTTPS origin Phase 4 needs.

Then Phase 4 proper: deploy `dist/` to HTTPS hosting, confirm
`/.well-known/assetlinks.json` is actually served from the origin root before
building anything, replace the zeroed fingerprint with the real signing key's
SHA-256, `bubblewrap init` → `build`, and install to the device. If the launched
app shows a browser address bar, assetlinks is wrong — fix it rather than
shipping it.
