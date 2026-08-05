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
- `mien-shiang-deploy.zip` is still a committed build artifact and still not in
  `.gitignore`. Deleting it is the user's call.

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

## Exact next action

The module boundary now exists and both adapters are imported by their
respective paths, so **reading copy is unblocked**.

1. Split `rules.js` into Module A and Module B content with separate copy
   decks. `TCM-202-DAMP-HEAT.recommend[1]` — the one deliberately failing test
   — resolves here: the "get bloods done" line is Module B content sitting in
   Module A, so it moves or goes rather than being reworded in place.
2. Then the Phase 2 content layer on top of the adapters.

Still outstanding from Phase 1, unchanged: **real-photo validation** (see
"Blocked" above). It gates Phase 1's exit, not Phase 2's start.
